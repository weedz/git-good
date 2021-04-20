import * as path from "path";
import { promises as fs } from "fs";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore, missing declations for Credential
import { Credential, Repository, Revwalk, Commit, Diff, ConvenientPatch, ConvenientHunk, DiffLine, Object, Branch, Graph, Index, Reset, Checkout, DiffFindOptions, Reference, Oid, Signature, Merge, Remote, DiffOptions } from "nodegit";
import { IpcAction, BranchObj, LineObj, HunkObj, PatchObj, CommitObj, IpcActionParams, IpcActionReturn, RefType } from "../Actions";
import { normalizeLocalName, normalizeRemoteName, normalizeRemoteNameWithoutRemote, normalizeTagName, remoteName } from "../Branch";
import { dialog, IpcMainEvent } from "electron";

export const actionLock: {
    [key in IpcAction]?: {
        interuptable: false
    };
} = {};

export function eventReply<T extends IpcAction>(event: IpcMainEvent, action: T, data: Error | IpcActionReturn[T], id?: string) {
    if (action in actionLock) {
        delete actionLock[action];
    }
    if (data instanceof Error) {
        return event.reply("asynchronous-reply", {
            action,
            error: data.toString(),
            id
        });
    }
    event.reply("asynchronous-reply", {
        action,
        data,
        id
    });
}

export function authenticate(username: string, auth: Auth) {
    if (auth.type === "ssh") {
        return Credential.sshKeyFromAgent(username || "git");
    } else if (auth.type === "userpass") {
        return Credential.userpassPlaintextNew(auth.username, auth.password);
    }
}
type HistoryCommit = {
    parents: string[]
    sha: string,
    message: string,
    date: number,
    author: {
        name: string,
        email: string,
    },
    path?: string
    status?: number
}
function compileHistoryCommit(commit: Commit): HistoryCommit {
    const author = commit.author();
    return {
        parents: commit.parents().map(oid => oid.tostrS()),
        sha: commit.sha(),
        message: commit.message(),
        date: commit.date().getTime(),
        author: {
            name: author.name(),
            email: author.email(),
        }
    };
}

const commitFilters = {
    default: (_: Commit, ..._args: unknown[]) => true,
}

function initRevwalk(repo: Repository, start: "refs/*" | Oid) {
    const revwalk = repo.createRevWalk();
    revwalk.sorting(Revwalk.SORT.TOPOLOGICAL | Revwalk.SORT.TIME);

    if (start === "refs/*") {
        revwalk.pushGlob(start);
    } else {
        revwalk.push(start);
    }
    return revwalk;
}

export async function getFileCommits(repo: Repository, branch: string, start: "refs/*" | Oid, file: string, num = 50000) {
    const revwalk = initRevwalk(repo, start);

    let followRenames = false;

    let currentName = file;
    // FIXME: HistoryEntry should set commit.repo.
    const historyEntries = await revwalk.fileHistoryWalk(currentName, num);

    if (historyEntries[0].status === Diff.DELTA.RENAMED) {
        // We always "follow renames" if the file is renamed in the first commit
        followRenames = true;
    }

    const commits: IpcActionReturn[IpcAction.LOAD_FILE_COMMITS]["commits"] = [];

    fileHistoryCache = {};

    for (const entry of historyEntries) {
        const commit = entry.commit;
        const historyCommit = compileHistoryCommit(entry.commit);
        historyCommit.status = entry.status;

        historyCommit.path = currentName;

        if (entry.status === Diff.DELTA.RENAMED) {
            historyCommit.path = entry.oldName;
        }

        if (entry.status === Diff.DELTA.RENAMED && followRenames) {
            followRenames = false;

            historyCommit.path = entry.newName;

            currentName = entry.oldName;
        }

        commits.push(historyCommit as HistoryCommit & { path: string });

        if (!entry.oldName) {
            entry.oldName = currentName;
        }
        fileHistoryCache[commit.sha()] = entry;
    }

    return {
        cursor: historyEntries[historyEntries.length - 1]?.commit.sha(),
        branch,
        commits
    };
}

export async function* getCommits(repo: Repository, branch: string, start: "refs/*" | Oid, num = 1000) {
    const revwalk = initRevwalk(repo, start);

    const filter = commitFilters.default;
    let cursorCommit: Commit | null = null;

    const history: Commit[] = [];
    for (const commit of await revwalk.commitWalk(num) as Array<Commit>) {
        if (await filter(commit)) {
            history.push(commit);
        } else {
            cursorCommit = commit;
        }
        if (history.length >= 100) {
            cursorCommit = history[history.length - 1];
            yield {
                branch,
                commits: history.splice(0, 100).map(compileHistoryCommit)
            };
        }
    }

    const cursor = history.length > 0 ? history[history.length - 1]?.sha() : cursorCommit?.sha();

    yield {
        cursor,
        commits: history.map(compileHistoryCommit),
        branch
    };
}

export async function pull(repo: Repository, branch: string | null): Promise<IpcActionReturn[IpcAction.PULL]> {
    let ref;
    if (branch) {
        try {
            ref = await repo.getReference(branch);
        } catch (err) {
            // invalid ref
            dialog.showErrorBox("Pull failed", `Invalid reference '${branch}'\n${err.message}`);
            return false;
        }
    } else {
        ref = await repo.head();
    }

    let upstream: Reference;
    try {
        upstream = await Branch.upstream(ref);
    }
    catch (err) {
        // Missing remote/upstream
        dialog.showErrorBox("Pull failed", "No upstream");
        return false;
    }
    const result = await repo.mergeBranches(ref, upstream, undefined, Merge.PREFERENCE.FASTFORWARD_ONLY);
    return !!result;
}

async function pushHead(repo: Repository, auth: Auth) {
    const head = await repo.head();
    let upstream;
    try {
        upstream = await Branch.upstream(head);
    }
    catch (err) {
        dialog.showErrorBox("Missing upstream", err.message);
        return false;
    }

    const remote = await repo.getRemote(remoteName(upstream.name()));
    const status = await Graph.aheadBehind(repo, head.target(), upstream.target()) as unknown as { ahead: number, behind: number };

    if (status.behind) {
        const result = await dialog.showMessageBox({
            title: "Force push?",
            message: `'${head.name()}' is behind the remote '${head.name()}'. Force push?`,
            type: "question",
            buttons: ["Yes", "No"],
            cancelId: 1,
        });
        if (result.response === 0) {
            return doPush(remote, head.name(), normalizeRemoteNameWithoutRemote(upstream.name()), auth, true);
        }
    } else {
        return doPush(remote, head.name(), normalizeRemoteNameWithoutRemote(upstream.name()), auth);
    }

    return false;
}

export async function push(repo: Repository, data: IpcActionParams[IpcAction.PUSH], auth: Auth) {
    if (!data) {
        return pushHead(repo, auth);
    }

    const localRef = await repo.getReference(data.localBranch);

    let remoteRefName: string;
    try {
        // throws if no upstream
        const remoteRef = await Branch.upstream(localRef);
        remoteRefName = normalizeRemoteNameWithoutRemote(remoteRef.name());
    } catch (err) {
        dialog.showErrorBox("Push failed", `Invalid upstream: ${err.message}`);
        return false;
    }

    const remote = await repo.getRemote(data.remote);
    return doPush(remote, data.localBranch, remoteRefName, auth, data.force);
}

async function doPush(remote: Remote, localName: string, remoteName: string, auth: Auth, forcePush = false) {
    // undocumented, https://github.com/nodegit/nodegit/issues/1270#issuecomment-293742772
    const force = forcePush ? "+" : "";
    try {
        // will return 0 on success
        const pushResult = await remote.push(
            [`${force}${localName}:refs/heads/${remoteName}`],
            {
                callbacks: {
                    credentials: (_url: string, username: string) => authenticate(username, auth),

                    // FIXME: Can we use this to show "progress" when pushing?
                    // transferProgress: (...args: any) => void,
                }
            }
        );
        return !pushResult;
    } catch (err) {
        // invalid authentication?
        // FIXME: return error message instead of displaying error dialog here
        dialog.showErrorBox("Push failed", err.message);
    }
    return false;
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
    const result = await Branch.setUpstream(reference, remoteRefName);

    return result;
}

export async function deleteRemoteRef(repo: Repository, refName: string, auth: Auth): Promise<IpcActionReturn[IpcAction.DELETE_REMOTE_REF]> {
    const ref = await repo.getReference(refName);

    if (ref.isRemote()) {
        refName = ref.name();
        const end = refName.indexOf("/", 14);
        const remoteName = refName.substring(13, end);
        const remote = await repo.getRemote(remoteName);

        const branchName = refName.substring(end + 1);

        try {
            await remote.push([`:refs/heads/${branchName}`], {
                callbacks: {
                    credentials: (_url: string, username: string) => authenticate(username, auth)
                }
            });
        } catch (err) {
            dialog.showErrorBox("No remote ref found", err.message);
        }
        ref.delete();
    }
    return false;
}

// {local: Branch[], remote: Branch[], tags: Branch[]}
export async function getBranches(repo: Repository): Promise<IpcActionReturn[IpcAction.LOAD_BRANCHES]> {
    const refs = await repo.getReferences();

    const local: BranchObj[] = [];
    const remote: BranchObj[] = [];
    const tags: BranchObj[] = [];

    // FIXME: Why do we get 2 references for "refs/remotes/origin/master"
    await Promise.all(
        refs.map(async (ref) => {
            const headCommit = await ref.peel(Object.TYPE.COMMIT);
            const refObj: BranchObj = {
                name: ref.name(),
                headSHA: headCommit.id().tostrS(),
                normalizedName: "",
                type: RefType.LOCAL,
            };

            if (ref.isBranch()) {
                try {
                    const upstream = await Branch.upstream(ref);
                    const upstreamHead = await upstream.peel(Object.TYPE.COMMIT);
                    refObj.remote = upstream.name();
                    refObj.status = await Graph.aheadBehind(repo, headCommit.id(), upstreamHead.id()) as unknown as { ahead: number, behind: number };
                } catch (_) {
                    // missing upstream
                }

                refObj.normalizedName = normalizeLocalName(refObj.name);
                local.push(refObj);
            } else if (ref.isRemote()) {
                refObj.normalizedName = normalizeRemoteName(refObj.name);
                refObj.type = RefType.REMOTE;
                remote.push(refObj);
            } else if (ref.isTag()) {
                refObj.normalizedName = normalizeTagName(refObj.name);
                refObj.type = RefType.TAG;
                tags.push(refObj);
            }
        })
    );

    const head = await repo.head();
    const headCommit = await head.peel(Object.TYPE.COMMIT);
    let headUpstream: string | undefined;
    try {
        const upstream = await Branch.upstream(head);
        headUpstream = upstream.name();
    } catch (_) {
        // no upstream for "head"
    }

    return {
        local,
        remote,
        tags,
        head: {
            name: head.name(),
            headSHA: headCommit.id().tostrS(),
            normalizedName: head.name(),
            type: RefType.LOCAL,
            remote: headUpstream
        }
    };
}

export async function remotes(repo: Repository): Promise<IpcActionReturn[IpcAction.REMOTES]> {
    const remotes = await repo.getRemotes();
    return remotes.map(remote => ({
        name: remote.name(),
        pullFrom: remote.url(),
        pushTo: remote.pushurl(),
    }))
}

export async function findFile(repo: Repository, file: string): Promise<IpcActionReturn[IpcAction.FIND_FILE]> {
    index = await repo.refreshIndex();

    const set = new Set<string>();

    let count = 0;

    for (const entry of index.entries()) {
        if (entry.path.toLocaleLowerCase().includes(file.toLocaleLowerCase())) {
            if (!set.has(entry.path)) {
                set.add(entry.path);
                count++;
            }
            if (count >= 99) {
                break;
            }
        }
    }

    return Array.from(set.values())
}

export async function commit(repo: Repository, params: IpcActionParams[IpcAction.COMMIT], committer: Signature) {
    if (!committer.email()) {
        return Error("No git credentials provided");
    }

    const parent = await repo.getHeadCommit();

    const oid = await index.writeTree();

    const message = params.message.body ? `${params.message.summary}\n\n${params.message.body}` : params.message.summary;

    try {
        if (params.amend) {
            const author = parent.author();
            await parent.amend("HEAD", author, committer, "utf8", message, oid);
        } else {
            await repo.createCommit("HEAD", committer, committer, message, oid, [parent]);
        }
    } catch (err) {
        return err;
    }

    return loadCommit(repo, null);
}

export async function refreshWorkDir(repo: Repository, options: IpcActionParams[IpcAction.REFRESH_WORKDIR]): Promise<IpcActionReturn[IpcAction.REFRESH_WORKDIR]> {
    index = await repo.refreshIndex();

    const flags = options?.flags || 0;
    const changes = await Promise.all([getUnstagedPatches(repo, flags), getStagedPatches(repo, flags)]);

    workDirIndexCache = {
        unstagedPatches: changes[0],
        stagedPatches: changes[1],
    };

    return {
        unstaged: workDirIndexCache.unstagedPatches.length,
        staged: workDirIndexCache.stagedPatches.length
    };
}

export async function stageFile(repo: Repository, filePath: string): Promise<IpcActionReturn[IpcAction.STAGE_FILE]> {
    index = await repo.refreshIndex();

    let result;

    try {
        // if fs.access throws the file does not exist on the filesystem
        // and needs to be removed from the index
        await fs.access(path.join(repo.workdir(), filePath));
        result = await index.addByPath(filePath);
    } catch (err) {
        result = await index.removeByPath(filePath);
    }

    if (!result) {
        await index.write();
    }

    return 0;
}
export async function unstageFile(repo: Repository, path: string): Promise<IpcActionReturn[IpcAction.UNSTAGE_FILE]> {
    const head = await repo.getHeadCommit();
    await Reset.default(repo, head, path);
    index = await repo.refreshIndex();

    return 0;
}
export async function discardChanges(repo: Repository, filePath: string): Promise<IpcActionReturn[IpcAction.DISCARD_FILE]> {
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

async function getUnstagedPatches(repo: Repository, flags: Diff.OPTION) {
    const unstagedDiff = await Diff.indexToWorkdir(repo, undefined, {
        flags: Diff.OPTION.SHOW_UNTRACKED_CONTENT | Diff.OPTION.RECURSE_UNTRACKED_DIRS | flags
    });
    const diffOpts: DiffFindOptions = {
        flags: Diff.FIND.RENAMES,
    };
    await unstagedDiff.findSimilar(diffOpts);
    return unstagedDiff.patches();
}

async function getStagedPatches(repo: Repository, flags: Diff.OPTION) {
    const head = await repo.getHeadCommit();
    const stagedDiff = await Diff.treeToIndex(repo, await head.getTree(), undefined, {
        flags
    });
    const diffOpts: DiffFindOptions = {
        flags: Diff.FIND.RENAMES,
    };
    await stagedDiff.findSimilar(diffOpts);
    return stagedDiff.patches();
}

export async function loadChanges(): Promise<IpcActionReturn[IpcAction.GET_CHANGES]> {
    workDirIndexPathMap = {
        staged: {},
        unstaged: {},
    };

    const staged = workDirIndexCache.stagedPatches.map(convPatch => {
        const patch = handlePatch(convPatch);
        workDirIndexPathMap.staged[patch.actualFile.path] = convPatch;
        return patch;
    });
    const unstaged = workDirIndexCache.unstagedPatches.map(convPatch => {
        const patch = handlePatch(convPatch);
        workDirIndexPathMap.unstaged[patch.actualFile.path] = convPatch;
        return patch;
    });
    return {
        staged,
        unstaged,
    };
}
export async function getWorkdirHunks(path: string, type: "staged" | "unstaged") {
    const patch = workDirIndexPathMap[type][path];
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
        oldLineno,
        newLineno,
        content: line.rawContent().trimEnd()
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
export async function getHunks(repo: Repository, sha: string, path: string): Promise<false | HunkObj[]> {
    const patch = commitObjectCache[sha]?.patches[path];
    if (patch) {
        return loadHunks(patch);
    }
    return false;
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

async function commit_diff_parent(commit: Commit, diffOptions?: DiffOptions) {
    const tree = await commit.getTree();

    // TODO: which parent to chose?
    const parents = await commit.getParents(1);
    if (parents.length) {
        const parent = parents[0];
        const parentTree = await parent.getTree();

        return await tree.diffWithOptions(parentTree, diffOptions) as Diff;
    }

    return await tree.diffWithOptions(null, diffOptions) as Diff;
}

export async function diff_file_at_commit(repo: Repository, file: string, sha: string) {
    const historyEntry = fileHistoryCache[sha];
    // FIXME: Cannot use this until Revwalk.fileHistoryWalk() sets repo on returned Commit items.
    // const commit = historyEntry.commit;
    const commit = await Commit.lookup(repo, sha);

    const pathspec = [file];

    // Find renames
    if (historyEntry.oldName !== file) {
        pathspec.push(historyEntry.oldName);
    } else if (historyEntry.newName !== file) {
        pathspec.push(historyEntry.newName);
    }

    const diff = await commit_diff_parent(commit, {
        pathspec,
        flags: Diff.OPTION.IGNORE_WHITESPACE,
    });
    await diff.findSimilar({
        flags: Diff.FIND.RENAMES
    });

    const convPatches = await diff.patches();
    if (!convPatches.length) {
        return Error("empty patch");
    }
    const patch = convPatches[0];

    const hunks = (await patch.hunks()).map(async hunk => (
        {
            header: hunk.header().trim(),
            lines: (await hunk.lines()).map(handleLine),
        }
    ));

    const patchObj = handlePatch(patch);
    patchObj.hunks = await Promise.all(hunks);

    return patchObj;
}

export async function resolveConflict(path: string) {
    // TODO: Promise<number>. seems to return undefined, not 0 on success
    const result = await index.conflictRemove(path || "");
    await index.addByPath(path);
    await index.write();
    return result;
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

async function handleDiff(diff: Diff, patches: { [path: string]: ConvenientPatch }) {
    return (await diff.patches()).map(convPatch => {
        const patch = handlePatch(convPatch);
        patches[patch.actualFile.path] = convPatch;
        return patch;
    });
}

export async function getCommitPatches(sha: string, options?: DiffOptions): Promise<IpcActionReturn[IpcAction.LOAD_PATCHES_WITHOUT_HUNKS]> {
    const commit = commitObjectCache[sha].commit;

    const diff = await commit_diff_parent(commit, options);
    await diff.findSimilar({
        flags: Diff.FIND.RENAMES,
    });

    return handleDiff(diff, commitObjectCache[currentCommit].patches);
}

export async function compareRevisions(repo: Repository, revisions: { from: string, to: string }) {
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

export async function loadCommit(repo: Repository, sha: string | null): Promise<IpcActionReturn[IpcAction.LOAD_COMMIT]> {
    let commit;
    if (sha) {
        commit = await commitWithDiff(repo, sha);
    } else {
        commit = await repo.getHeadCommit();
    }

    const author = commit.author();
    const committer = commit.committer();

    const msg = commit.message();
    const msgSummary = msg.substring(0, msg.indexOf("\n") >>> 0);
    const msgBody = msg.substring(msgSummary.length).trim();

    return {
        parents: commit.parents().map(parent => ({ sha: parent.tostrS() })),
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

export async function checkoutBranch(repo: Repository, branch: string) {
    try {
        await repo.checkoutBranch(branch);
        const head = await repo.head();
        const headCommit = await head.peel(Object.TYPE.COMMIT);
        return {
            name: head.name(),
            headSHA: headCommit.id().tostrS(),
            normalizedName: head.name(),
            type: RefType.LOCAL
        };
    } catch (err) {
        return err;
    }
}

export type Auth = {
    type: "ssh"
    agent: boolean
} | {
    type: "userpass"
    username: string
    password: string
};

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
let fileHistoryCache: {
    [sha: string]: Revwalk.HistoryEntry
} = {};
let workDirIndexCache: {
    unstagedPatches: ConvenientPatch[]
    stagedPatches: ConvenientPatch[]
};
let workDirIndexPathMap: {
    staged: { [path: string]: ConvenientPatch },
    unstaged: { [path: string]: ConvenientPatch },
}
let index: Index;
