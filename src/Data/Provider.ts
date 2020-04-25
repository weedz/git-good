import { Repository, Revwalk, Commit, Branch, Reference, Diff, ConvenientPatch, ConvenientHunk, DiffLine } from "nodegit";

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

function buildRef(ref: Reference) {
    return {
        name: ref.name()
    };
}

// {local: Branch[], remote: Branch[], tags: Branch[]}
export async function getBranches(repo: Repository) {
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

    return {
        local,
        remote,
        tags
    };
}

type LineStats = {
    total_context: number
    total_additions: number
    total_deletions: number
}
type FileObj = {
    path: string
    size: number
    mode: number
    flags: number
}

type LineObj = {
    type: string
    oldLineno: number
    newLineno: number
    content: string
}
type HunkObj = {
    header: string
    lines: LineObj[]
}
type PatchObj = {
    type: string
    status: number
    hunks: HunkObj[]
    lineStats: LineStats
    newFile: FileObj
    oldFile: FileObj
}
type DiffObj = {
    patches: PatchObj[]
}
type AuthorObj = {
    name: string
    email: string
}
export type CommitObj = {
    parent: {
        sha: string
    },
    sha: string
    diff: DiffObj[]
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
        oldLineno: line.oldLineno(),
        newLineno: line.newLineno(),
        content: line.content().trim()
    };
}
async function handleHunk(hunk: ConvenientHunk): Promise<HunkObj> {
    const header = hunk.header().trim()
    const lines = await hunk.lines();

    return {
        header: header.substring(0, header.indexOf("@@", 2) + 2),
        lines: await Promise.all(lines.map(handleLine))
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
async function handleDiff(diff: Diff) {
    const patches = await diff.patches();
    return {
        patches: await Promise.all(patches.map(handlePatch))
    };
}

export async function getCommit(commit: Commit): Promise<CommitObj> {
    const parent = commit.parentcount() && await commit.parent(0) || commit;

    const diffs = await commit.getDiff();

    const diff = await Promise.all(
        diffs.map(handleDiff)
    );

    return {
        parent: {
            sha: parent.sha(),
        },
        sha: commit.sha(),
        diff,
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
