import { Repository, Revwalk, Commit, Branch, Reference } from "nodegit";

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

export async function getCommit(commit: Commit) {
    const parent = commit.parentcount() && await commit.parent(0) || commit;
    return {
        // parent: (await commit.parent(0)).sha(),
        parent: {
            sha: parent.sha(),
        },
        sha: commit.sha(),
        // diff: await commit.getDiff(),
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
