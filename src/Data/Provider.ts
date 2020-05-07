import { Repository, Revwalk, Commit, Reference, Diff, ConvenientPatch, ConvenientHunk, DiffLine, Tree } from "nodegit";
import { IPCAction } from "./Actions";

export async function getCommits(repo: Repository, start?: Commit, num: number = 100) {
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

export type BranchObj = {
    name: string
}
export type BranchesObj = {
    remote: BranchObj[]
    local: BranchObj[]
    tags: BranchObj[]
    head?: BranchObj
}
function buildRef(ref: Reference): BranchObj {
    return {
        name: ref.name()
    };
}

// {local: Branch[], remote: Branch[], tags: Branch[]}
export async function getBranches(repo: Repository): Promise<BranchesObj> {
    const refs = await repo.getReferences();
    const local = [];
    const remote = [];
    const tags = [];
    for (const ref of refs) {
        if (ref.isBranch()) {
            local.push(buildRef(ref));
        } else if (ref.isRemote()) {
            remote.push(buildRef(ref));
        } else if (ref.isTag()) {
            tags.push(buildRef(ref));
        }
    }
    
    const head = await repo.head();
    
    return {
        local,
        remote,
        tags,
        head: {
            name: head.name()
        }
    };
}

type LineStats = {
    total_context: number
    total_additions: number
    total_deletions: number
}
export type FileObj = {
    path: string
    size: number
    mode: number
    flags: number
}

export type LineObj = {
    type: string
    oldLineno: number
    newLineno: number
    content: string
    // offset: number
    // length: number
}
export type HunkObj = {
    header: string
    lines?: LineObj[]
    // old: number
    // new: number
}
export type PatchObj = {
    type: string
    status: number
    hunks?: HunkObj[]
    lineStats: LineStats
    newFile: FileObj
    oldFile: FileObj
}
export type DiffObj = {
    patches?: PatchObj[]
}
export type AuthorObj = {
    name: string
    email: string
}
export type CommitObj = {
    parent: {
        sha: string
    },
    sha: string
    diff?: DiffObj[]
    date: number
    message: string
    author: AuthorObj
    commiter: AuthorObj
}

async function handleLine(line: DiffLine): Promise<LineObj> {
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
    const header = hunk.header().trim()
    const lines = await hunk.lines();
    
    return {
        header: header.substring(0, header.indexOf("@@", 2) + 2),
        lines: await Promise.all(lines.map(handleLine)),
        // old: hunk.oldStart(),
        // new: hunk.newStart()
    };
}
async function handlePatch(patch: ConvenientPatch): Promise<PatchObj> {
    const hunks = await patch.hunks();
    
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
    return {
        type,
        status: patch.status(),
        hunks: await Promise.all(hunks.map(handleHunk)),
        lineStats: patch.lineStats(),
        newFile: {
            path: patch.newFile().path(),
            size: patch.newFile().size(),
            mode: patch.newFile().mode(),
            flags: patch.newFile().flags(),
        },
        oldFile: {
            path: patch.oldFile().path(),
            size: patch.oldFile().size(),
            mode: patch.oldFile().mode(),
            flags: patch.oldFile().flags(),
        }
    };
}
async function handleDiff(diff: Diff, event: Electron.IpcMainEvent) {
    // TODO: possible to optimize this for large patches?
    const patches = await diff.patches();
    for (const patch of patches) {
        handlePatch(patch).then(patchWithHunks => {
            event.reply("asynchronous-reply", {
                action: IPCAction.PATCH_WITH_HUNKS,
                data: patchWithHunks
            });
        });
    }
}

export async function getCommitWithDiff(repo: Repository, sha: string, event: Electron.IpcMainEvent): Promise<CommitObj> {
    // const parent = commit.parentcount() && await commit.parent(0) || commit;
    // const diffs = await commit.getDiff();

    const commit = await repo.getCommit(sha);
    const parent = await commit.parent(0);
    
    // TODO: fix this. Merge commits are a bit messy without this.
    const diffs = await commit.getTree().then(async (thisTree) => {
        // TODO: which parent to chose?
        const parents = await commit.getParents(1);
        let diffs;
        if (parents.length) {
            // TODO: how many parents?
            diffs = parents.map(async (parent) => {
                const parentTree = await parent.getTree();
                return thisTree.diffWithOptions(parentTree);
            });
        }
        else {
            // @ts-ignore, from nodegit source.
            diffs = [thisTree.diffWithOptions(null)];
        }
        return Promise.all(diffs);
    });

    for (const diff of diffs) {
        handleDiff(diff, event);
    }

    return {
        parent: {
            sha: parent.sha(),
        },
        sha: commit.sha(),
        // diff,
        date: commit.date().getTime(),
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
