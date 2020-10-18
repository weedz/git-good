import * as path from "path";
import { promises as fs } from "fs";
import { Repository, Revwalk, Commit, Diff, ConvenientPatch, ConvenientHunk, DiffLine, Object, Branch, Graph, Index, Reset, Checkout, DiffFindOptions, Blame, Cred, Reference, Oid, Signature } from "nodegit";
import { IpcMainEvent } from "electron/main";
import { IpcAction, BranchObj, BranchesObj, LineObj, HunkObj, PatchObj, CommitObj, IpcActionParams, IpcActionReturn, IpcActionReturnError } from "../Actions";
import { normalizeLocalName, normalizeRemoteName, normalizeTagName } from "../Branch";
import { dialog } from "electron";

export let actionLock: {
    [key in IpcAction]?: {
        interuptable: false
    };
} = {};

export function eventReply<T extends IpcAction>(event: Electron.IpcMainEvent, action: T, data: IpcActionReturn[T] | IpcActionReturnError) {
    if (action in actionLock) {
        delete actionLock[action];
    }
    event.reply("asynchronous-reply", {
        action,
        data
    });
}

export function eventReplyError<T extends IpcAction>(event: Electron.IpcMainEvent, action: T, error: string) {
    const data: IpcActionReturnError = {
        error
    };
    event.reply("asynchronous-reply", {
        action,
        data
    });
}

export function authenticate(url: string, username: string) {
    if (auth.type === "ssh") {
        return Cred.sshKeyFromAgent(username || "git");
    } else if (auth.type === "userpass") {
        return Cred.userpassPlaintextNew(auth.username, auth.password);
    }
}

function compileHistoryCommit(commit: Commit) {
    return {
        parents: commit.parents && commit.parents().map(oid => oid.tostrS()),
        sha: commit.sha(),
        message: commit.message(),
        date: commit.date().getTime(),
        author: {
            name: commit.author().name(),
            email: commit.author().email(),
        }
    };
}

export async function *getCommits(repo: Repository, branch: string, start: "refs/*" | Oid, file?: string, num: number = 1000) {
    const revwalk = repo.createRevWalk();
    revwalk.sorting(Revwalk.SORT.TOPOLOGICAL | Revwalk.SORT.TIME);

    if (start === "refs/*") {
        revwalk.pushGlob(start);
    } else {
        revwalk.push(start);
    }

    if (file) {
        const commits = await revwalk.fileHistoryWalk(file, num) as {commit: Commit, status: number, isMergeCommit: boolean}[];
        yield {
            cursor: commits[commits.length - 1]?.commit.sha(),
            branch,
            commits: commits.map(historyEntry => compileHistoryCommit(historyEntry.commit))
        };
    } else {
        // TODO: more filters..
        const filter = async (_: Commit) => true;
        let cursorCommit: Commit | null = null;

        const history: Commit[] = [];
        for await (const oid of walkTheRev(revwalk, num)) {
            const commit = await Commit.lookup(repo, oid);
            if (await filter(commit)) {
                history.push(commit);
            }
            if (history.length >= 100) {
                cursorCommit = history[history.length - 1];
                yield {
                    branch,
                    commits: history.splice(0, 100).map(compileHistoryCommit)
                };
            }
        }

        const cursor = cursorCommit ? cursorCommit.sha() : history[history.length - 1]?.sha();

        yield {
            cursor,
            commits: history.map(compileHistoryCommit),
            branch
        };
    }
}

async function *walkTheRev(revwalk: Revwalk, num: number) {
    let count = 0;
    while (count < num) {
        count++;
        try {
            const oid = revwalk.next();
            yield oid;
        } catch {
            return false;
        }
    }
}

export async function pull(repo: Repository) {
    const head = await repo.head();
    const upstream = await Branch.upstream(head);
    const result = await repo.mergeBranches(head, upstream);
    return !!result;
}

export async function push(repo: Repository, data: IpcActionParams[IpcAction.PUSH]) {
    const remote = await repo.getRemote(data.remote);
    let localRef;

    if (!data.localBranch) {
        localRef = await repo.head();
        data.localBranch = localRef.name();
    } else {
        localRef = await repo.getReference(data.localBranch);
    }

    try {
        // throws if no upstream
        await Branch.upstream(localRef);
    } catch (err) {
        console.log("push failed, invalid upstream");
        return 1;
    }

    if (!data.remoteBranch) {
        data.remoteBranch = data.localBranch;
    }

    // undocumented, https://github.com/nodegit/nodegit/issues/1270#issuecomment-293742772
    const force = data.force ? "+" : "";

    let pushResult: number = 1;
    try {
        pushResult = await remote.push(
            [`${force}${data.localBranch}:${data.remoteBranch}`],
            {
                callbacks: {
                    credentials: authenticate
                }
            }
        );
    } catch (err) {
        // invalid authentication?
        console.warn("push failed", err);
    }

    return pushResult;
}

export async function setUpstream(repo: Repository, local: string, remoteRefName: string | null) {
    const reference = await repo.getReference(local);
    if (remoteRefName) {
        try {
            await repo.getReference(remoteRefName);
        } catch (err) {
            await Reference.create(repo, `refs/remotes/${remoteRefName}`, (await reference.peel(Object.TYPE.COMMIT)).id() as unknown as Oid, 0, "");
        }
    }
    // @ts-ignore, https://www.nodegit.org/api/branch/#setUpstream (pass NULL to unset)
    const result = await Branch.setUpstream(reference, remoteRefName);

    return result;
}

export async function deleteRemoteRef(repo: Repository, refName: string) {
    const ref = await repo.getReference(refName);

    if (ref.isRemote()) {
        refName = ref.name();
        const end = refName.indexOf("/", 14);
        const remoteName = refName.substr(13, end - 13);
        const remote = await repo.getRemote(remoteName);

        const branchName = refName.substr(end + 1);

        try {
            await remote.push([`:refs/heads/${branchName}`], {
                callbacks: {
                    credentials: authenticate
                }
            });
        } catch (err) {
            console.log("no remote ref found", err);
        }
        ref.delete();
    }
    return false;
}

// {local: Branch[], remote: Branch[], tags: Branch[]}
export async function getBranches(repo: Repository) {
    const refs = await repo.getReferences();

    const local: BranchesObj["local"] = [];
    const remote: BranchObj[] = [];
    const tags: BranchObj[] = [];

    await Promise.all(
        refs.map(async (ref) => {
            const headCommit = await ref.peel(Object.TYPE.COMMIT);
            const refObj: BranchObj = {
                name: ref.name(),
                headSHA: headCommit.id().tostrS(),
                normalizedName: ""
            };

            if (ref.isBranch()) {
                try {
                    const upstream = await Branch.upstream(ref);
                    const upstreamHead = await upstream.peel(Object.TYPE.COMMIT);
                    refObj.remote = upstream.name();
                    refObj.status = await Graph.aheadBehind(repo, headCommit.id(), upstreamHead.id()) as unknown as {ahead: number, behind: number};
                } catch(_) {
                    // missing upstream
                }

                refObj.normalizedName = normalizeLocalName(refObj.name);
                local.push(refObj);
            } else if (ref.isRemote()) {
                refObj.normalizedName = normalizeRemoteName(refObj.name);
                remote.push(refObj);
            } else if (ref.isTag()) {
                try {
                    await repo.getTagByName(refObj.name);
                    refObj.normalizedName = normalizeTagName(refObj.name);
                    tags.push(refObj);
                } catch (err) {
                    // invalid tag?
                }
            }
        })
    );
    
    const head = await repo.head();
    const headCommit = await head.peel(Object.TYPE.COMMIT);
    
    return {
        local,
        remote,
        tags,
        head: {
            name: head.name(),
            headSHA: headCommit.id().tostrS(),
            normalizedName: head.name(),
        }
    };
}

export async function remotes(repo: Repository) {
    const remotes = await repo.getRemotes();
    return remotes.map(remote => remote.name());
}

export async function findFile(repo: Repository, file: string) {
    index = await repo.refreshIndex();

    const results: string[] = [];

    const entries = index.entries();

    for (const entry of entries) {
        if (entry.path.toLocaleLowerCase().includes(file.toLocaleLowerCase())) {
            results.push(entry.path);
            if (results.length >= 100) {
                break;
            }
        }
    }

    return results;
}

export async function commit(repo: Repository, params: IpcActionParams[IpcAction.COMMIT]) {
    // TODO: get from settings
    const committer = Signature.now("Linus Björklund", "weedzcokie@gmail.com");

    const parent = await repo.getHeadCommit();

    const oid = await index.writeTree();

    const message = params.message.body ? `${params.message.summary}\n${params.message.body}` : params.message.summary;

    let newCommit;

    if (params.amend) {
        const author = parent.author();
        newCommit = await parent.amend("HEAD", author, committer, "utf8", message, oid);
    } else {
        newCommit = await repo.createCommit("HEAD", committer, committer, message, oid, [parent]);
    }

    return !!newCommit;
}

export async function refreshWorkDir(repo: Repository) {
    index = await repo.refreshIndex();

    const changes = await Promise.all([getStagedPatches(repo), getUnstagedPatches(repo)]);

    workDirIndexCache = {
        unstagedPatches: changes[0],
        stagedPatches: changes[1],
    };

    return {
        unstaged: workDirIndexCache.unstagedPatches.length,
        staged: workDirIndexCache.stagedPatches.length
    };
}

export async function stageFile(repo: Repository, filePath: string) {
    index = await repo.refreshIndex();
    const status = index.getByPath(filePath);

    let result;
    try {
        await fs.access(path.join(repo.workdir(), status.path));
        result = await index.addByPath(filePath);
    } catch(err) {
        result = await index.removeByPath(filePath);
    }

    if (!result) {
        await index.write();
    }
    return 0;
}
export async function unstageFile(repo: Repository, path: string) {
    const head = await repo.getHeadCommit();
    const result = await Reset.default(repo, head, path);
    index = await repo.refreshIndex();

    return 0;
}
export async function discardChanges(repo: Repository, filePath: string) {
    if (!index.getByPath(filePath)) {
        // file not found in index (untracked), delete?
        const result = await dialog.showMessageBox({
            message: `Delete untracked file ${filePath}?`,
            type: "question",
            buttons: ["Confirm", "Cancel"],
            cancelId: 1,
        });
        if (result.response === 0) {
            await fs.unlink(path.join(repo.workdir(), filePath));
        }
        return 0;
    }
    try {
        const head = await repo.getHeadCommit();
        const tree = await head.getTree();
        await Checkout.tree(repo, tree, { checkoutStrategy: Checkout.STRATEGY.FORCE, paths: [filePath] });
    } catch (err) {
        console.error(err)
    }

    return 0;
}

async function getStagedPatches(repo: Repository) {
    const unstagedDiff = await Diff.indexToWorkdir(repo, undefined, {
        flags: Diff.OPTION.SHOW_UNTRACKED_CONTENT | Diff.OPTION.RECURSE_UNTRACKED_DIRS
    });
    const diffOpts: DiffFindOptions = {
        flags: Diff.FIND.RENAMES | Diff.FIND.IGNORE_WHITESPACE,
    };
    await unstagedDiff.findSimilar(diffOpts);
    return unstagedDiff.patches();
}

async function getUnstagedPatches(repo: Repository) {
    const head = await repo.getHeadCommit();
    const stagedDiff = await Diff.treeToIndex(repo, await head.getTree());
    const diffOpts: DiffFindOptions = {
        flags: Diff.FIND.RENAMES | Diff.FIND.IGNORE_WHITESPACE,
    };
    await stagedDiff.findSimilar(diffOpts);
    return stagedDiff.patches();
}

export async function loadChanges() {
    workDirIndexPathMap = {};

    const staged = workDirIndexCache.stagedPatches.map(convPatch => {
        const patch = handlePatch(convPatch);
        workDirIndexPathMap[patch.actualFile.path] = convPatch;
        return patch;
    });
    const unstaged = workDirIndexCache.unstagedPatches.map(convPatch => {
        const patch = handlePatch(convPatch);
        workDirIndexPathMap[patch.actualFile.path] = convPatch;
        return patch;
    });
    return {
        staged,
        unstaged,
    };
}
export async function getWorkdirHunks(path: string) {
    const patch = workDirIndexPathMap[path];
    return loadHunks(patch);
}

function handleLine(line: DiffLine): LineObj {
    const oldLineno = line.oldLineno();
    const newLineno = line.newLineno();
    let type = "";
    if (oldLineno === -1) {
        type = "+";
    } else if (newLineno === -1) {
        type = "-"
    }
    return {
        type,
        offset: line.contentOffset(),
        length: line.contentLen(),
        oldLineno: oldLineno,
        newLineno: newLineno,
        content: line.rawContent().trimRight()
    };
}
async function handleHunk(hunk: ConvenientHunk): Promise<HunkObj> {
    const lines = await hunk.lines();
    
    return {
        header: hunk.header().trim(),
        lines: lines.map(handleLine),
        // old: hunk.oldStart(),
        // new: hunk.newStart()
    };
}
export async function getHunks(sha: string, path: string): Promise<false | HunkObj[]> {
    const patch = commitObjectCache[sha]?.patches[path];
    return loadHunks(patch);
}
export async function hunksFromCompare(path: string): Promise<false | HunkObj[]> {
    return loadHunks(compareObjCache.patches[path]);
}
async function loadHunks(patch: ConvenientPatch) {
    if (!patch) {
        return false;
    }

    const hunks = await patch.hunks();
    return Promise.all(hunks.map(handleHunk));
}

function handlePatch(patch: ConvenientPatch): PatchObj {
    const patchNewFile = patch.newFile();
    const patchOldFile = patch.oldFile();

    const newFile = {
        path: patchNewFile.path(),
        size: patchNewFile.size(),
        mode: patchNewFile.mode(),
        flags: patchNewFile.flags(),
    };
    const oldFile = {
        path: patchOldFile.path(),
        size: patchOldFile.size(),
        mode: patchOldFile.mode(),
        flags: patchOldFile.flags(),
    };

    const patchResult: PatchObj = {
        status: patch.status(),
        lineStats: patch.lineStats(),
        newFile,
        oldFile,
        actualFile: newFile.path ? newFile : oldFile,
    };

    return patchResult;
}

async function handleDiff(diff: Diff, patches: {[path: string]: ConvenientPatch}) {
    return (await diff.patches()).map(convPatch => {
        const patch = handlePatch(convPatch);
        patches[patch.actualFile.path] = convPatch;
        return patch;
    });
}

export async function getCommitPatches(_: Repository, sha: string) {
    const commit = commitObjectCache[sha].commit;
    
    // TODO: fix this. Merge commits are a bit messy without this.
    const tree = await commit.getTree();
    const diffOpts: DiffFindOptions = {
        flags: Diff.FIND.RENAMES | Diff.FIND.IGNORE_WHITESPACE,
    };

    // TODO: which parent to chose?
    const parents = await commit.getParents(1);
    let diffs: Diff[];
    if (parents.length) {
        // TODO: how many parents?
        diffs = await Promise.all(
            parents.map(parent => parent.getTree().then(parentTree => tree.diffWithOptions(parentTree)))
        );
    }
    else {
        // @ts-ignore, from nodegit source.
        diffs = [await tree.diffWithOptions(null)];
    }

    const patches = diffs.map(async diff => {
        await diff.findSimilar(diffOpts);
        return handleDiff(diff, commitObjectCache[currentCommit].patches);
    });

    return (await Promise.all(patches)).flat();
}

export async function compareRevisions(repo: Repository, revisions: {from: string, to: string}) {
    const fromCommit = repo.getReference(revisions.from)
        .then(ref => ref.peel(Object.TYPE.COMMIT) as unknown as Commit)
        .then(commit => commit.id().tostrS())
        .catch(() => revisions.from)
        .then(sha => repo.getCommit(sha));

    const toCommit = repo.getReference(revisions.to)
        .then(ref => ref.peel(Object.TYPE.COMMIT) as unknown as Commit)
        .then(commit => commit.id().tostrS())
        .catch(() => revisions.to)
        .then(sha => repo.getCommit(sha));

    return Promise.all([fromCommit, toCommit]).then(async commits => {
        // TODO: show commits if `descandant === true`
        compareObjCache = {
            descendant: await Graph.descendantOf(repo, commits[0].id(), commits[1].id()) === 1,
            from: commits[0],
            to: commits[1],
            patches: {}
        };
        return true;
    }).catch(_ => {
        return false;
    });
}

export async function compareRevisionsPatches() {
    const from = compareObjCache.from;
    const to = compareObjCache.to;
    
    // TODO: fix this. Merge commits are a bit messy without this.
    const tree = await to.getTree();
    const diffOpts: DiffFindOptions = {
        flags: Diff.FIND.RENAMES | Diff.FIND.IGNORE_WHITESPACE,
    };

    const diff = await from.getTree().then(async fromTree => await tree.diffWithOptions(fromTree));
    await diff.findSimilar(diffOpts);

    const patches = await handleDiff(diff, compareObjCache.patches);

    return patches.flat();
}

export async function loadCommit(repo: Repository, sha?: string) {
    let commit;
    if (sha) {
        commit = await commitWithDiff(repo, sha);
    } else {
        commit = await repo.getHeadCommit();
    }

    const author = commit.author();
    const committer = commit.committer();

    const msg = commit.message();
    const msgSummary = msg.substr(0, msg.indexOf("\n")>>>0);
    const msgBody = msg.substr(msgSummary.length).trimStart().trimEnd();

    return {
        parents: commit.parents().map(parent => ({sha: parent.tostrS()})),
        sha: commit.sha(),
        authorDate: author.when().time(),
        date: committer.when().time(),
        message: {
            summary: msgSummary,
            body: msgBody
        },
        author: {
            name: author.name(),
            email: author.email()
        },
        committer: {
            name: committer.name(),
            email: committer.email()
        },
    } as CommitObj;
}

export async function commitWithDiff(repo: Repository, sha: string) {
    currentCommit = sha;

    const commit = await repo.getCommit(sha);
    commitObjectCache = {
        [sha]: {
            commit,
            patches: {},
        }
    };

    return commit;
}

export async function changeBranch(repo: Repository, branch: string) {
    try {
        await repo.checkoutBranch(branch);
        const head = await repo.head();
        const headCommit = await head.peel(Object.TYPE.COMMIT);
        return {
            name: head.name(),
            headSHA: headCommit.id().tostrS(),
            normalizedName: head.name(),
        };
    } catch(err) {
        console.error(err);
        return false;
    }
}

export async function blameFile(repo: Repository, filePath: string) {
    try {
        const blame = await Blame.file(repo, filePath);

        const fullFilePath = path.join(repo.workdir(), filePath);
        const file = await fs.readFile(fullFilePath);

        const lines = file.toString("utf8").split("\n");

        // console.log(lines.map( (line, lineNumber) => `${lineNumber}: ${line}`).join("\n"), file.length, blame);
        // console.log(blame.getHunkCount());
        console.log(lines);

        const hunkCount = blame.getHunkCount();
        for (let i = 0; i < hunkCount; i++) {
            const hunk = blame.getHunkByIndex(i)
            console.log(hunk.finalCommitId().tostrS().slice(0,8), hunk.origCommitId().tostrS().slice(0,8), hunk.finalStartLineNumber(), hunk.origStartLineNumber(), hunk.linesInHunk());

            const startIndex = hunk.finalStartLineNumber() - 1;
            console.log(lines.slice(startIndex, startIndex + hunk.linesInHunk()).join("\n"));
        }

    } catch (err) {
        console.error(err);
    }
    return {};
}

type Auth = {
    type: "ssh"
} | {
    type: "userpass",
    username: string,
    password: string
};

// TODO: Make this configurable. global- and per reposotiry
let auth: Auth = {
    type: "userpass",
    username: "personal-access-token",
    password: "x-oauth-basic"
};
export const GitAuth: Readonly<typeof auth> = auth;

let currentCommit: string;
let commitObjectCache: {
    [sha: string]: {
        commit: Commit
        patches: {
            [path: string]: ConvenientPatch
        }
    }
} = {};
let compareObjCache: {
    descendant: boolean
    from: Commit
    to: Commit
    patches: {
        [path: string]: ConvenientPatch
    }
};
let workDirIndexCache: {
    unstagedPatches: ConvenientPatch[]
    stagedPatches: ConvenientPatch[]
};
let workDirIndexPathMap: {
    [path: string]: ConvenientPatch
}
let index: Index;
