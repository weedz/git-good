import { Repository, Revwalk, Commit, Diff, ConvenientPatch, ConvenientHunk, DiffLine, Object, DiffFile } from "nodegit";
import { IPCAction, BranchObj, BranchesObj, LineObj, HunkObj, PatchObj, CommitObj, IPCActionReturn } from "./Actions";

export function eventReply<T extends IPCAction>(event: Electron.IpcMainEvent, action: T, data: IPCActionReturn[T]) {
    event.reply("asynchronous-reply", {
        action,
        data
    });
}

export async function getCommits(repo: Repository, start?: Commit, num: number = 100): Promise<IPCActionReturn[IPCAction.LOAD_COMMITS]> {
    const revwalk = repo.createRevWalk();
    if (!start) {
        start = await repo.getHeadCommit();
    }
    revwalk.push(start.id());
    revwalk.sorting(Revwalk.SORT.TOPOLOGICAL);
    
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

    const local: BranchObj[] = [];
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
                refObj.normalizedName = refObj.name.substring(11);
                local.push(refObj);
            } else if (ref.isRemote()) {
                refObj.normalizedName = refObj.name.substring(13);
                remote.push(refObj);
            } else if (ref.isTag()) {
                refObj.normalizedName = refObj.name.substring(10);
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

function handleLine(line: DiffLine): LineObj {
    let type = "";
    if (line.oldLineno() === -1) {
        type = "+";
    } else if (line.newLineno() === -1) {
        type = "-"
    }
    return {
        type,
        // offset: line.contentOffset(),
        // length: line.contentLen(),
        oldLineno: line.oldLineno(),
        newLineno: line.newLineno(),
        content: line.content().trimRight()
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
    const patch = commitObjectCache[sha][path];
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

    const newFile = {
        path: patch.newFile().path(),
        size: patch.newFile().size(),
        mode: patch.newFile().mode(),
        flags: patch.newFile().flags(),
    };
    const oldFile = {
        path: patch.oldFile().path(),
        size: patch.oldFile().size(),
        mode: patch.oldFile().mode(),
        flags: patch.oldFile().flags(),
    };

    const patchResult: PatchObj = {
        type,
        status: patch.status(),
        lineStats: patch.lineStats(),
        newFile,
        oldFile,
        actualFile: newFile.path ? newFile : oldFile,
    };
    
    commitObjectCache[currentCommit][patchResult.actualFile.path] = patch;

    return patchResult;
}

async function handleDiff(diff: Diff, event: Electron.IpcMainEvent) {
    const convenientPatches = await diff.patches();

    while (convenientPatches.length) {
        const patchSet = convenientPatches.splice(0, 100).map(handlePatch);
        eventReply(event, IPCAction.PATCH_WITHOUT_HUNKS, patchSet);
    }

    eventReply(event, IPCAction.PATCH_WITHOUT_HUNKS, { done: true });
}

export async function getCommitWithDiff(repo: Repository, sha: string, event: Electron.IpcMainEvent): Promise<CommitObj> {
    currentCommit = sha;
    commitObjectCache = {
        [sha]: {}
    };

    const commit = await repo.getCommit(sha);
    
    // TODO: fix this. Merge commits are a bit messy without this.
    commit.getTree().then(async (thisTree) => {
        const diffOpts = {
            flags: Diff.FIND.RENAMES,
        };
        // TODO: which parent to chose?
        const parents = await commit.getParents(1);
        let diffs: Promise<DiffFile[]>[];
        if (parents.length) {
            // TODO: how many parents?
            diffs = [];
            for (const parent of parents) {
                diffs.push(
                    parent.getTree().then(parentTree => thisTree.diffWithOptions(parentTree))
                );
            }
        }
        else {
            // @ts-ignore, from nodegit source.
            diffs = [thisTree.diffWithOptions(null)];
        }
        for (const promise of diffs) {
            promise.then(diff => {
                // @ts-ignore
                diff.findSimilar(diffOpts);
                handleDiff(diff as unknown as Diff, event);
            });
        }
    });

    return {
        parents: commit.parents().map(parent => ({sha: parent.tostrS()})),
        sha: commit.sha(),
        authorDate: commit.author().when().time(),
        date: commit.committer().when().time(),
        message: commit.message(),
        author: {
            name: commit.author().name(),
            email: commit.author().email()
        },
        commiter: {
            name: commit.committer().name(),
            email: commit.committer().email()
        },
    };
}

let currentCommit: string;
let commitObjectCache: {
    [sha: string]: {
        [path: string]: ConvenientPatch
    }
} = {};
