import { Repository, Revwalk, Commit, Diff, ConvenientPatch, ConvenientHunk, DiffLine, Object, Branch, Graph, Index, Reset, Checkout, DiffFindOptions } from "nodegit";
import { IpcAction, BranchObj, BranchesObj, LineObj, HunkObj, PatchObj, CommitObj, IpcActionReturn, IpcActionReturnError } from "../Actions";
import { normalizeLocalName, normalizeRemoteName, normalizeTagName } from "../Branch";
import { IpcMainEvent } from "electron/main";

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
export async function getCommits(event: IpcMainEvent, revwalk: Revwalk, repo: Repository, file?: string, num: number = 1000) {
    if (file) {
        const commits = await revwalk.fileHistoryWalk(file, num) as {commit: Commit, status: number, isMergeCommit: boolean}[];
        return commits.map(historyEntry => compileHistoryCommit(historyEntry.commit));
    } else {
        // TODO: more filters..
        const filter = async (_: Commit) => true;
    
        const history: Commit[] = [];
        for await (const oid of walkTheRev(revwalk, num)) {
            const commit = await Commit.lookup(repo, oid);
            if (await filter(commit)) {
                history.push(commit);
            }
            if (history.length >= 100) {
                eventReply(event, IpcAction.LOAD_COMMITS_PARTIAL, history.splice(0, 100).map(compileHistoryCommit));
            }
        }
        return history.map(compileHistoryCommit);
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

// {local: Branch[], remote: Branch[], tags: Branch[]}
export async function getBranches(repo: Repository): Promise<BranchesObj> {
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
                refObj.normalizedName = normalizeTagName(refObj.name);
                tags.push(refObj);
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

export async function stageFile(repo: Repository, path: string) {
    index = await repo.refreshIndex();
    const result = await index.addByPath(path);
    if (!result) {
        // TODO: this is a promise.
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
export async function discardChanges(repo: Repository, path: string) {
    try {
        const head = await repo.getHeadCommit();
        const tree = await head.getTree();
        await Checkout.tree(repo, tree, { checkoutStrategy: Checkout.STRATEGY.FORCE, paths: [path] });
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

export function loadChanges() {
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

export async function getCommitPatches(sha: string) {
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
        // @ts-ignore
        diffs = await Promise.all(
            parents.map(parent => parent.getTree().then(parentTree => tree.diffWithOptions(parentTree)))
        );
    }
    else {
        // @ts-ignore, from nodegit source.
        diffs = [await tree.diffWithOptions(null)];
    }

    // console.log(diffs);

    const patches = diffs.map(async diff => {
        await diff.findSimilar(diffOpts);
        return handleDiff(diff, commitObjectCache[currentCommit].patches);
    });

    return (await Promise.all(patches)).flat();
}

export async function compareRevisions(repo: Repository, revisions: {from: string, to: string}) {
    const fromCommit = await repo.getCommit(revisions.from).catch(_ => repo.getReferenceCommit(revisions.from));
    if (!fromCommit) {
        return false;
    }

    const  toCommit = await repo.getCommit(revisions.to).catch(_ => repo.getReferenceCommit(revisions.to));
    if (!toCommit) {
        return false;
    }

    // TODO: show commits if `descandant === true`
    compareObjCache = {
        descendant: await Graph.descendantOf(repo, toCommit.id(), fromCommit.id()) === 1,
        from: fromCommit,
        to: toCommit,
        patches: {}
    };
    return true;
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

export async function commitWithDiff(repo: Repository, sha: string) {
    currentCommit = sha;

    const commit = await repo.getCommit(sha);
    commitObjectCache = {
        [sha]: {
            commit,
            patches: {},
        }
    };

    const author = commit.author();
    const committer = commit.committer();

    return {
        parents: commit.parents().map(parent => ({sha: parent.tostrS()})),
        sha: commit.sha(),
        authorDate: author.when().time(),
        date: committer.when().time(),
        message: commit.message(),
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
