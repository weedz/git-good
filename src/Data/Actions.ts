export enum IpcAction {
    LOAD_COMMITS,
    LOAD_BRANCHES,
    OPEN_REPO,
    LOAD_COMMIT,
    LOAD_PATCHES_WITHOUT_HUNKS,
    LOAD_HUNKS,
    CHECKOUT_BRANCH,
    REFRESH_WORKDIR,
    GET_CHANGES,
    STAGE_FILE,
    UNSTAGE_FILE,
    DISCARD_FILE,
    COMMIT,
    PULL,
    PUSH,
    SET_UPSTREAM,
    CREATE_BRANCH,
    CREATE_BRANCH_FROM_REF,
    DELETE_REF,
    DELETE_REMOTE_REF,
    FIND_FILE,
    ABORT_REBASE,
    CONTINUE_REBASE,
    OPEN_COMPARE_REVISIONS,
    BLAME_FILE,
    REMOTES,
    RESOLVE_CONFLICT,
}

export type IpcActionParams = {
    [IpcAction.LOAD_COMMITS]: LoadCommitsParam
    [IpcAction.LOAD_BRANCHES]: never
    [IpcAction.OPEN_REPO]: string | null
    [IpcAction.LOAD_COMMIT]: string | null
    [IpcAction.LOAD_PATCHES_WITHOUT_HUNKS]: string
    [IpcAction.LOAD_HUNKS]: 
    ({
        workDir: boolean
    } | {
        sha: string
    } | {
        compare: boolean
    }) & {
        path: string
    }
    [IpcAction.CHECKOUT_BRANCH]: string
    [IpcAction.REFRESH_WORKDIR]: never
    [IpcAction.GET_CHANGES]: never
    [IpcAction.STAGE_FILE]: string
    [IpcAction.UNSTAGE_FILE]: string
    [IpcAction.DISCARD_FILE]: string
    [IpcAction.COMMIT]: {
        amend?: boolean
        message: {
            summary: string
            body: string
        }
    }
    [IpcAction.PULL]: never
    [IpcAction.PUSH]: {
        force?: boolean
        remote: string
        localBranch: string
        remoteBranch?: string
    }
    [IpcAction.SET_UPSTREAM]: {
        local: string
        remote: string | null
    }
    [IpcAction.CREATE_BRANCH]: {
        sha: string
        name: string
    }
    [IpcAction.CREATE_BRANCH_FROM_REF]: {
        ref: string
        name: string
    }
    [IpcAction.DELETE_REF]: {
        name: string
        force?: boolean
        prune?: boolean
    }
    [IpcAction.DELETE_REMOTE_REF]: string
    [IpcAction.FIND_FILE]: string
    [IpcAction.ABORT_REBASE]: never
    [IpcAction.CONTINUE_REBASE]: never
    [IpcAction.OPEN_COMPARE_REVISIONS]: {from: string, to: string}
    [IpcAction.BLAME_FILE]: string
    [IpcAction.REMOTES]: never
    [IpcAction.RESOLVE_CONFLICT]: {path: string}
};

export type IpcActionReturn = {
    [IpcAction.LOAD_COMMITS]: LoadCommitsReturn
    [IpcAction.LOAD_BRANCHES]: BranchesObj
    [IpcAction.OPEN_REPO]: {
        opened: boolean
        path: string
        status: null | RepoStatus
    }
    [IpcAction.LOAD_COMMIT]: CommitObj
    [IpcAction.LOAD_PATCHES_WITHOUT_HUNKS]: PatchObj[]
    [IpcAction.LOAD_HUNKS]: {
        path: string
        hunks: HunkObj[] | false
    }
    [IpcAction.CHECKOUT_BRANCH]: false | BranchObj
    [IpcAction.REFRESH_WORKDIR]: {
        unstaged: number
        staged: number
    }
    [IpcAction.GET_CHANGES]: {
        staged: PatchObj[]
        unstaged: PatchObj[]
    }
    [IpcAction.STAGE_FILE]: {result: number}
    [IpcAction.UNSTAGE_FILE]: {result: number}
    [IpcAction.DISCARD_FILE]: {result: number}
    [IpcAction.COMMIT]: {result: boolean}
    [IpcAction.PULL]: {result: boolean}
    [IpcAction.PUSH]: {result: boolean}
    [IpcAction.SET_UPSTREAM]: {result: boolean}
    [IpcAction.CREATE_BRANCH]: {result: boolean}
    [IpcAction.CREATE_BRANCH_FROM_REF]: {result: boolean}
    [IpcAction.DELETE_REF]: {result: boolean}
    [IpcAction.DELETE_REMOTE_REF]: {result: boolean}
    [IpcAction.FIND_FILE]: {result: string[]}
    [IpcAction.ABORT_REBASE]: RepoStatus
    [IpcAction.CONTINUE_REBASE]: RepoStatus
    [IpcAction.OPEN_COMPARE_REVISIONS]: PatchObj[]
    [IpcAction.BLAME_FILE]: unknown
    [IpcAction.REMOTES]: {result: string[]}
    [IpcAction.RESOLVE_CONFLICT]: boolean
};

export type IpcActionReturnError = {
    error: string
};

export type RepoStatus = {
    merging: boolean
    rebasing: boolean
    reverting: boolean
    bisecting: boolean
    state: number // Repository.STATE
};

export type LineStats = {
    total_context: number
    total_additions: number
    total_deletions: number
};
export type FileObj = {
    path: string
    size: number
    mode: number
    flags: number
};

export type LineObj = {
    type: string
    oldLineno: number
    newLineno: number
    content: string
    offset?: number
    length?: number
};
export type HunkObj = {
    header: string
    lines?: LineObj[]
    // old: number
    // new: number
};
export type PatchObj = {
    status: number
    hunks?: HunkObj[]
    newFile: FileObj
    oldFile: FileObj
    actualFile: FileObj
    similarity?: number
    lineStats: LineStats
};
export type DiffObj = {
    patches?: PatchObj[]
};
export type AuthorObj = {
    name: string
    email: string
};
export type CommitObj = {
    parents: {
        sha: string
    }[],
    sha: string
    diff?: DiffObj[]
    authorDate: number
    date: number
    message: {
        summary: string
        body: string
    }
    author: AuthorObj
    committer: AuthorObj
};

export enum RefType {
    LOCAL,
    TAG,
    REMOTE,
    NOTE,
}

export type BranchObj = {
    name: string
    headSHA: string
    normalizedName: string
    status?: {
        ahead: number
        behind: number
    }
    remote?: string
    type: RefType
};

export type BranchesObj = {
    remote: BranchObj[]
    local: BranchObj[]
    tags: BranchObj[]
    head?: BranchObj
};
interface LoadCommitsParamSha {
    sha: string
}
interface LoadCommitsParamBranch {
    branch: string
}
type LoadCommitsParam = {
    /** SHA of last fetched commit */
    cursor?: string
    num?: number
    file?: string
} & (LoadCommitsParamBranch | LoadCommitsParamSha | {history: true})
export type LoadCommitReturn = {
    sha: string
    parents: string[]
    message: string
    date: number
    author: {
        name: string
        email: string
    }
}
type LoadCommitsReturn = {
    commits: LoadCommitReturn[]
    branch: string
    cursor?: string
};

export enum Locks {
    MAIN,
    BRANCH_LIST,
}
