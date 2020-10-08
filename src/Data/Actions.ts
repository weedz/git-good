export enum IpcAction {
    LOAD_COMMITS,
    LOAD_COMMITS_PARTIAL,
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
    COMMIT,
    DISCARD_FILE,
    PULL,
    PUSH,
    SET_UPSTREAM,
    CREATE_BRANCH,
    CREATE_BRANCH_FROM_REF,
    DELETE_REF,
    FIND_FILE,
    ABORT_REBASE,
    CONTINUE_REBASE,
    OPEN_COMPARE_REVISIONS,
    BLAME_FILE,
};

export type IpcActionParams = {
    [IpcAction.LOAD_BRANCHES]: never
    [IpcAction.LOAD_COMMITS]: LoadCommitsParam
    [IpcAction.LOAD_COMMITS_PARTIAL]: never
    [IpcAction.OPEN_REPO]: string
    [IpcAction.LOAD_COMMIT]: string
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
        summary: string
        message: string
    }
    [IpcAction.PULL]: never
    [IpcAction.SET_UPSTREAM]: {
        local: string
        remote: string
    }
    [IpcAction.PUSH]: {
        force?: boolean
        remote: string
        localBranch: string
        remoteBranch: string
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
    [IpcAction.FIND_FILE]: string
    [IpcAction.ABORT_REBASE]: never
    [IpcAction.CONTINUE_REBASE]: never
    [IpcAction.OPEN_COMPARE_REVISIONS]: {from: string, to: string}
    [IpcAction.BLAME_FILE]: string
};

export type IpcActionReturn = {
    [IpcAction.LOAD_BRANCHES]: BranchesObj
    [IpcAction.LOAD_COMMITS]: LoadCommitsReturn
    [IpcAction.LOAD_COMMITS_PARTIAL]: LoadCommitsReturn
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
    [IpcAction.STAGE_FILE]: number
    [IpcAction.UNSTAGE_FILE]: number
    [IpcAction.DISCARD_FILE]: number
    [IpcAction.COMMIT]: boolean
    [IpcAction.PULL]: boolean
    [IpcAction.PUSH]: boolean
    [IpcAction.SET_UPSTREAM]: boolean
    [IpcAction.CREATE_BRANCH]: boolean
    [IpcAction.CREATE_BRANCH_FROM_REF]: boolean
    [IpcAction.DELETE_REF]: boolean
    [IpcAction.FIND_FILE]: string[]
    [IpcAction.ABORT_REBASE]: RepoStatus
    [IpcAction.CONTINUE_REBASE]: RepoStatus
    [IpcAction.OPEN_COMPARE_REVISIONS]: PatchObj[]
    [IpcAction.BLAME_FILE]: any
};

export type IpcActionReturnError = {
    error: string
};

export enum IpcEvent {};
export type IpcEventParams = {};

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
    message: string
    author: AuthorObj
    committer: AuthorObj
};

export type BranchObj = {
    name: string
    headSHA: string
    normalizedName: string
    status?: {
        ahead: number
        behind: number
    }
    remote?: string
};

export type BranchesObj = {
    remote: BranchObj[]
    local: BranchObj[]
    tags: BranchObj[]
    head?: BranchObj
};
interface LoadCommitsParamSha {
    sha: string
};
interface LoadCommitsParamBranch {
    branch: string
};
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
type LoadCommitsReturn = LoadCommitReturn[];

export enum Locks {
    MAIN
};
