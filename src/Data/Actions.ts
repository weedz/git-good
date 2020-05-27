export enum IpcAction {
    LOAD_COMMITS,
    LOAD_COMMIT_HISTORY,
    LOAD_BRANCHES,
    OPEN_REPO,
    LOAD_COMMIT,
    PATCH_WITHOUT_HUNKS,
    LOAD_HUNKS,
    CHECKOUT_BRANCH,
};

export type IpcActionParams = {
    [IpcAction.LOAD_BRANCHES]: never
    [IpcAction.LOAD_COMMITS]: LoadCommitsParam
    [IpcAction.LOAD_COMMIT_HISTORY]: {num?: number}
    [IpcAction.OPEN_REPO]: string
    [IpcAction.LOAD_COMMIT]: string
    [IpcAction.PATCH_WITHOUT_HUNKS]: never
    [IpcAction.LOAD_HUNKS]: {
        sha: string
        path: string
    }
    [IpcAction.CHECKOUT_BRANCH]: string
};

export type IpcActionReturn = {
    [IpcAction.LOAD_BRANCHES]: BranchesObj
    [IpcAction.LOAD_COMMITS]: LoadCommitsReturn
    [IpcAction.LOAD_COMMIT_HISTORY]: LoadCommitsReturn
    [IpcAction.OPEN_REPO]: {
        opened: boolean
        path: string
    }
    [IpcAction.LOAD_COMMIT]: CommitObj
    [IpcAction.PATCH_WITHOUT_HUNKS]: PatchObj[] | { done: boolean }
    [IpcAction.LOAD_HUNKS]: {
        path: string
        hunks: HunkObj[] | false
    }
    [IpcAction.CHECKOUT_BRANCH]: false | BranchObj
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
type LoadCommitsParam = {num?: number} & (LoadCommitsParamBranch | LoadCommitsParamSha)
type LoadCommitsReturn = {
    sha: string
    message: string
    date: number
    author: {
        name: string
        email: string
    }
}[];
