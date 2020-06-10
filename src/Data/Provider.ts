import { Repository, Revwalk, Commit, Diff, ConvenientPatch, ConvenientHunk, DiffLine, Object, DiffFile, Branch, Graph, Index, Reset, Checkout } from "nodegit";
import { IpcAction, BranchObj, BranchesObj, LineObj, HunkObj, PatchObj, CommitObj, IpcActionReturn, IpcActionReturnError } from "./Actions";
import { normalizeLocalName, normalizeRemoteName, normalizeTagName } from "./Branch";

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

export async function getCommits(revwalk: Revwalk, num: number = 100): Promise<IpcActionReturn[IpcAction.LOAD_COMMITS]> {
    const commits = await revwalk.getCommits(num);
    
    return commits.map(commit => ({
        sha: commit.sha(),
        message: commit.message(),
        date: commit.date().getTime(),
        author: {
            name: commit.author().name(),
            email: commit.author().email(),
        }
    }));
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
        console.log(err)
    }

    return 0;
}

async function getStagedPatches(repo: Repository) {
    const unstagedDiff = await Diff.indexToWorkdir(repo, undefined, {
        flags: Diff.OPTION.SHOW_UNTRACKED_CONTENT | Diff.OPTION.RECURSE_UNTRACKED_DIRS
    });
    return unstagedDiff.patches();
}

async function getUnstagedPatches(repo: Repository) {
    const head = await repo.getHeadCommit();
    const stagedDiff = await Diff.treeToIndex(repo, await head.getTree());
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
        // offset: line.contentOffset(),
        // length: line.contentLen(),
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
export async function getHunks(sha: string, path: string) {
    const patch = commitObjectCache[sha]?.patches[path];
    return loadHunks(patch);
}
async function loadHunks(patch: ConvenientPatch) {
    if (!patch) {
        return false;
    }

    const hunks = await patch.hunks();
    return Promise.all(hunks.map(handleHunk));
}
function handlePatch(patch: ConvenientPatch): PatchObj {
    let type = "";
    if (patch.isAdded()) {
        type = "A";
    } else if (patch.isDeleted()) {
        type = "D";
    } else if (patch.isModified()) {
        type = "M";
    } else if (patch.isRenamed()) {
        type = "R";
    }

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
        type,
        status: patch.status(),
        lineStats: patch.lineStats(),
        newFile,
        oldFile,
        actualFile: newFile.path ? newFile : oldFile,
    };

    return patchResult;
}

async function handleDiff(diff: Diff) {
    const convenientPatches = await diff.patches();
    return convenientPatches.map(convPatch => {
        const patch = handlePatch(convPatch);
        commitObjectCache[currentCommit].patches[patch.actualFile.path] = convPatch;
        return patch;
    });
}

export async function getCommitPatches(sha: string) {
    const commit = commitObjectCache[sha].commit;
    
    // TODO: fix this. Merge commits are a bit messy without this.
    const tree = await commit.getTree();
    const diffOpts = {
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

    const patches = diffs.map(diff => {
        // @ts-ignore
        diff.findSimilar(diffOpts);
        return handleDiff(diff as unknown as Diff);
    });

    return (await Promise.all(patches)).flat();
}

export async function getCommitWithDiff(repo: Repository, sha: string) {
    currentCommit = sha;

    const commit = await repo.getCommit(sha);
    commitObjectCache = {
        [sha]: {
            commit,
            patches: {}
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

let currentCommit: string;
let commitObjectCache: {
    [sha: string]: {
        commit: Commit
        patches: {
            [path: string]: ConvenientPatch
        }
    }
} = {};
let workDirIndexCache: {
    unstagedPatches: ConvenientPatch[]
    stagedPatches: ConvenientPatch[]
};
let workDirIndexPathMap: {
    [path: string]: ConvenientPatch
}
let index: Index;
