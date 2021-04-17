import { Diff, DiffOptions } from "nodegit";
import { AppConfig } from "./Config";

export type IpcPayload<T extends IpcAction> = {
    id?: string
    action: T
} & (
    {data: IpcActionReturn[T]} | {error: IpcActionReturnError}
);

export type IpcPayloadMsg<T extends IpcAction> = IpcActionReturn[T] | {error: IpcActionReturnError["msg"]};

export enum IpcAction {
    LOAD_COMMITS,
    LOAD_FILE_COMMITS,
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
    RENAME_LOCAL_BRANCH,
    FIND_FILE,
    ABORT_REBASE,
    CONTINUE_REBASE,
    OPEN_COMPARE_REVISIONS,
    REMOTES,
    RESOLVE_CONFLICT,
    EDIT_REMOTE,
    NEW_REMOTE,
    REMOVE_REMOTE,
    FETCH,
    SAVE_SETTINGS,
    GET_SETTINGS,
    FILE_DIFF_AT,
}

export type IpcActionParams = {
    [IpcAction.LOAD_COMMITS]: LoadCommitsParam
    [IpcAction.LOAD_FILE_COMMITS]: LoadFileCommitsParam
    [IpcAction.LOAD_BRANCHES]: null
    [IpcAction.OPEN_REPO]: string | null
    [IpcAction.LOAD_COMMIT]: string | null
    [IpcAction.LOAD_PATCHES_WITHOUT_HUNKS]: {
        sha: string
        options?: DiffOptions
    }
    [IpcAction.LOAD_HUNKS]: (
        {
            file: string
            sha: string
        } | {
            workDir: boolean
            type: "staged" | "unstaged"
        } | {
            sha: string
        } | {
            compare: boolean
        }
    ) & {
        path: string
    }
    [IpcAction.CHECKOUT_BRANCH]: string
    [IpcAction.REFRESH_WORKDIR]: DiffOptions | null
    [IpcAction.GET_CHANGES]: null
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
    [IpcAction.PULL]: null
    [IpcAction.PUSH]: null | {
        force?: boolean
        remote: string
        localBranch: string
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
    [IpcAction.RENAME_LOCAL_BRANCH]: {
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
    [IpcAction.ABORT_REBASE]: null
    [IpcAction.CONTINUE_REBASE]: null
    [IpcAction.OPEN_COMPARE_REVISIONS]: {from: string, to: string}
    [IpcAction.REMOTES]: null
    [IpcAction.RESOLVE_CONFLICT]: {path: string}
    [IpcAction.EDIT_REMOTE]: {oldName: string, name: string, pullFrom: string, pushTo?: string}
    [IpcAction.NEW_REMOTE]: {name: string, pullFrom: string, pushTo?: string}
    [IpcAction.REMOVE_REMOTE]: {name: string}
    [IpcAction.FETCH]: null | {remote: string}
    [IpcAction.SAVE_SETTINGS]: AppConfig
    [IpcAction.GET_SETTINGS]: string | null
    [IpcAction.FILE_DIFF_AT]: {
        file: string
        sha: string
        options?: DiffOptions
    }
};

export type IpcActionReturn = {
    [IpcAction.LOAD_COMMITS]: LoadCommitsReturn
    [IpcAction.LOAD_FILE_COMMITS]: LoadFileCommitsReturn
    [IpcAction.LOAD_BRANCHES]: BranchesObj & {head: BranchObj}
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
    [IpcAction.COMMIT]: CommitObj
    [IpcAction.PULL]: {result: boolean}
    [IpcAction.PUSH]: {result: boolean}
    [IpcAction.SET_UPSTREAM]: {result: boolean}
    [IpcAction.CREATE_BRANCH]: {result: boolean}
    [IpcAction.CREATE_BRANCH_FROM_REF]: {result: boolean}
    [IpcAction.DELETE_REF]: {result: boolean}
    [IpcAction.DELETE_REMOTE_REF]: {result: boolean}
    [IpcAction.RENAME_LOCAL_BRANCH]: {result: boolean}
    [IpcAction.FIND_FILE]: {result: string[]}
    [IpcAction.ABORT_REBASE]: RepoStatus
    [IpcAction.CONTINUE_REBASE]: RepoStatus
    [IpcAction.OPEN_COMPARE_REVISIONS]: PatchObj[]
    [IpcAction.REMOTES]: {
        name: string
        pushTo?: string
        pullFrom: string
    }[]
    [IpcAction.RESOLVE_CONFLICT]: {result: boolean}
    [IpcAction.EDIT_REMOTE]: {result: boolean}
    [IpcAction.NEW_REMOTE]: {result: boolean}
    [IpcAction.REMOVE_REMOTE]: {result: boolean}
    [IpcAction.FETCH]: {result: boolean}
    [IpcAction.SAVE_SETTINGS]: {result: boolean}
    [IpcAction.GET_SETTINGS]: AppConfig
    [IpcAction.FILE_DIFF_AT]: PatchObj | false
};

export type IpcActionReturnError = {
    msg: string
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
    lines: LineObj[]
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
};
interface LoadCommitsParamSha {
    sha: string
}
interface LoadCommitsParamBranch {
    branch: string
}
type LoadFileCommitsParam = {
    /** SHA of last fetched commit */
    cursor?: string
    startAtCursor?: boolean
    num?: number
    file: string
}
type LoadCommitsParam = {
    /** SHA of last fetched commit */
    cursor?: string
    startAtCursor?: boolean
    num?: number
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
type LoadFileCommitsReturn = {
    commits: Array<LoadCommitReturn & {
        // FIXME: Enforce `status`?
        status?: Diff.DELTA
        path: string
    }>
    branch: string
    cursor?: string
};

export enum Locks {
    MAIN,
    BRANCH_LIST,
}
