export enum IPCAction {
    LOAD_COMMITS,
    LOAD_BRANCHES,
    OPEN_REPO,
    LOAD_COMMIT,
    PATCH_WITHOUT_HUNKS,
    LOAD_HUNKS,
};

export type IPCActionParams = {
    [IPCAction.LOAD_BRANCHES]: never
    [IPCAction.LOAD_COMMITS]: {
        branch: string
    } | {
        sha: string
    }
    [IPCAction.OPEN_REPO]: string
    [IPCAction.LOAD_COMMIT]: string
    [IPCAction.PATCH_WITHOUT_HUNKS]: never
    [IPCAction.LOAD_HUNKS]: {
        sha: string
        path: string
    }
}

export type LineStats = {
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
    actualFile: FileObj
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

export type BranchObj = {
    name: string
}

export type BranchesObj = {
    remote: BranchObj[]
    local: BranchObj[]
    tags: BranchObj[]
    head?: BranchObj
}
interface LoadCommitsParamSha {
    sha: string
}
interface LoadCommitsParamBranch {
    branch: string
}
export type LoadCommitsParam = {num?: number} & (LoadCommitsParamBranch | LoadCommitsParamSha)
export type LoadCommitsReturn = {
    sha: string
    message: string
    date: number
    author: {
        name: string
        email: string
    }
}[]

export type LoadHunksReturn = {
    path: string
    hunks: HunkObj[] | false
}
