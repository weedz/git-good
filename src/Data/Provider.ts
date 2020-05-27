import { Repository, Revwalk, Commit, Diff, ConvenientPatch, ConvenientHunk, DiffLine, Object, DiffFile, Branch, Graph } from "nodegit";
import { IpcAction, BranchObj, BranchesObj, LineObj, HunkObj, PatchObj, CommitObj, IpcActionReturn } from "./Actions";

export function eventReply<T extends IpcAction>(event: Electron.IpcMainEvent, action: T, data: IpcActionReturn[T]) {
    event.reply("asynchronous-reply", {
        action,
        data
    });
}

export async function getCommits(repo: Repository, start?: Commit, num: number = 100): Promise<IpcActionReturn[IpcAction.LOAD_COMMITS]> {
    const revwalk = repo.createRevWalk();
    if (!start) {
        start = await repo.getHeadCommit();
    }
    revwalk.sorting(Revwalk.SORT.TOPOLOGICAL);
    revwalk.push(start.id());
    
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
                    refObj.status = await Graph.aheadBehind(repo, headCommit.id(), upstreamHead.id()) as unknown as {ahead: number, behind: number};
                } catch(_) {
                    // missing upstream
                }

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
    
    commitObjectCache[currentCommit][patchResult.actualFile.path] = patch;

    return patchResult;
}

async function handleDiff(diff: Diff, event: Electron.IpcMainEvent) {
    const convenientPatches = await diff.patches();

    while (convenientPatches.length) {
        const patchSet = convenientPatches.splice(0, 100).map(handlePatch);
        eventReply(event, IpcAction.PATCH_WITHOUT_HUNKS, patchSet);
    }

    eventReply(event, IpcAction.PATCH_WITHOUT_HUNKS, { done: true });
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
    };
}

let currentCommit: string;
let commitObjectCache: {
    [sha: string]: {
        [path: string]: ConvenientPatch
    }
} = {};
