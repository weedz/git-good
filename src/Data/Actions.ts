export enum IPCAction {
    LOAD_COMMITS,
    LOAD_BRANCHES,
    OPEN_REPO,
    LOAD_COMMIT,
    PATCH_WITHOUT_HUNKS,
    LOAD_HUNKS,
    CHECKOUT_BRANCH,
};

export type IPCActionParams = {
    [IPCAction.LOAD_BRANCHES]: never
    [IPCAction.LOAD_COMMITS]: LoadCommitsParam
    [IPCAction.OPEN_REPO]: string
    [IPCAction.LOAD_COMMIT]: string
    [IPCAction.PATCH_WITHOUT_HUNKS]: never
    [IPCAction.LOAD_HUNKS]: {
        sha: string
        path: string
    }
    [IPCAction.CHECKOUT_BRANCH]: string
};

export type IPCActionReturn = {
    [IPCAction.LOAD_BRANCHES]: BranchesObj
    [IPCAction.LOAD_COMMITS]: LoadCommitsReturn
    [IPCAction.OPEN_REPO]: boolean
    [IPCAction.LOAD_COMMIT]: CommitObj
    [IPCAction.PATCH_WITHOUT_HUNKS]: PatchObj[] | { done: boolean }
    [IPCAction.LOAD_HUNKS]: {
        path: string
        hunks: HunkObj[] | false
    }
    [IPCAction.CHECKOUT_BRANCH]: false | BranchObj
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
    commiter: AuthorObj
};

export type BranchObj = {
    name: string
    headSHA: string
    normalizedName: string
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
