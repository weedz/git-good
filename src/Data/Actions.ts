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
    COMMIT,
    DISCARD_FILE,
};

export type IpcActionParams = {
    [IpcAction.LOAD_BRANCHES]: never
    [IpcAction.LOAD_COMMITS]: LoadCommitsParam
    [IpcAction.OPEN_REPO]: string
    [IpcAction.LOAD_COMMIT]: string
    [IpcAction.LOAD_PATCHES_WITHOUT_HUNKS]: string
    [IpcAction.LOAD_HUNKS]: 
    ({
        workDir: boolean
    } | {
        sha: string
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
};

export type IpcActionReturn = {
    [IpcAction.LOAD_BRANCHES]: BranchesObj
    [IpcAction.LOAD_COMMITS]: LoadCommitsReturn
    [IpcAction.OPEN_REPO]: {
        opened: boolean
        path: string
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
};

export type IpcActionReturnError = {
    error: string
};

export enum IpcEvent {};
export type IpcEventParams = {};

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
    // offset: number
    // length: number
};
export type HunkObj = {
    header: string
    lines?: LineObj[]
    // old: number
    // new: number
};
export type PatchObj = {
    type: string
    status: number
    hunks?: HunkObj[]
    lineStats: LineStats
    newFile: FileObj
    oldFile: FileObj
    actualFile: FileObj
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
type LoadCommitsParam = {num?: number} & (LoadCommitsParamBranch | LoadCommitsParamSha | {history: true})
type LoadCommitsReturn = {
    sha: string
    message: string
    date: number
    author: {
        name: string
        email: string
    }
}[];
