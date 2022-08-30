import type { DiffOptions } from "nodegit";
import type { AppConfig } from "./Config";
import { DiffDelta } from "./Utils";

export type IpcPayload<T extends IpcAction> = {
    id?: number
    action: T
} & (
    {data: IpcActionReturn[T]} | {error: string}
);

export type IpcActionReturnOrError<A extends IpcAction> = IpcActionReturn[A] | Error;
export type AsyncIpcActionReturnOrError<A extends IpcAction> = Promise<IpcActionReturnOrError<A>>;

export type IpcResponse<T extends IpcAction> = IpcActionReturnOrError<T> | false;

export type IpcActionReturnError = {
    msg: Error
};

export type IpcPayloadMsg<T extends IpcAction> = {result: IpcActionReturn[T]} | {error: IpcActionReturnError["msg"]};

export const enum IpcAction {
    INIT = 0,
    LOAD_COMMITS,
    LOAD_FILE_COMMITS,
    LOAD_BRANCHES,
    LOAD_HEAD,
    LOAD_UPSTREAMS,
    OPEN_REPO,
    LOAD_COMMIT,
    LOAD_PATCHES_WITHOUT_HUNKS,
    LOAD_HUNKS,
    SHOW_STASH,
    CHECKOUT_BRANCH,
    REFRESH_WORKDIR,
    GET_CHANGES,
    STAGE_FILE,
    UNSTAGE_FILE,
    STAGE_ALL,
    UNSTAGE_ALL,
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
    OPEN_COMPARE_REVISIONS,
    REMOTES,
    RESOLVE_CONFLICT,
    EDIT_REMOTE,
    NEW_REMOTE,
    FETCH,
    SAVE_SETTINGS,
    REPO_PROFILE,
    GET_SETTINGS,
    FILE_DIFF_AT,
    CREATE_TAG,
    PARSE_REVSPEC,
    LOAD_STASHES,
    GET_COMMIT_GPG_SIGN,
}

export type IpcActionParams = {
    [IpcAction.INIT]: null
    [IpcAction.LOAD_COMMITS]: LoadCommitsParam
    [IpcAction.LOAD_FILE_COMMITS]: LoadFileCommitsParam
    [IpcAction.LOAD_BRANCHES]: null
    [IpcAction.LOAD_HEAD]: null
    [IpcAction.LOAD_UPSTREAMS]: null
    [IpcAction.OPEN_REPO]: string | null
    [IpcAction.LOAD_COMMIT]: string | null
    [IpcAction.LOAD_PATCHES_WITHOUT_HUNKS]: {
        sha: string
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
    [IpcAction.SHOW_STASH]: number
    [IpcAction.CHECKOUT_BRANCH]: string
    [IpcAction.REFRESH_WORKDIR]: null | {
        ignoreWhitespace: boolean
    }
    [IpcAction.GET_CHANGES]: null
    [IpcAction.STAGE_FILE]: string
    [IpcAction.UNSTAGE_FILE]: string
    [IpcAction.STAGE_ALL]: null
    [IpcAction.UNSTAGE_ALL]: null
    [IpcAction.COMMIT]: {
        amend: boolean | undefined
        message: {
            summary: string
            body: string
        }
    }
    [IpcAction.PULL]: null | string
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
        checkout?: boolean
    }
    [IpcAction.CREATE_BRANCH_FROM_REF]: {
        ref: string
        name: string
        checkout?: boolean
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
    [IpcAction.OPEN_COMPARE_REVISIONS]: {from: string, to: string}
    [IpcAction.REMOTES]: null
    [IpcAction.RESOLVE_CONFLICT]: {path: string}
    [IpcAction.EDIT_REMOTE]: {oldName: string, name: string, pullFrom: string, pushTo: string | null}
    [IpcAction.NEW_REMOTE]: {name: string, pullFrom: string, pushTo: string | null}
    [IpcAction.FETCH]: null | {remote: string}
    [IpcAction.SAVE_SETTINGS]: AppConfig
    [IpcAction.GET_SETTINGS]: null
    [IpcAction.REPO_PROFILE]: {action: "save" | "remove", profileId: number}
    [IpcAction.FILE_DIFF_AT]: {
        file: string
        sha: string
        options?: DiffOptions
    }
    [IpcAction.CREATE_TAG]: {
        name: string
        from: string
        fromCommit: boolean
        annotation?: string
    }
    [IpcAction.PARSE_REVSPEC]: string
    [IpcAction.LOAD_STASHES]: null
    [IpcAction.GET_COMMIT_GPG_SIGN]: string
};

export type IpcActionReturn = {
    [IpcAction.INIT]: {
        repo: IpcActionReturn[IpcAction.OPEN_REPO]
    }
    [IpcAction.LOAD_COMMITS]: LoadCommitsReturn
    [IpcAction.LOAD_FILE_COMMITS]: LoadFileCommitsReturn
    [IpcAction.LOAD_BRANCHES]: BranchesObj
    [IpcAction.LOAD_HEAD]: null | HeadBranchObj
    [IpcAction.LOAD_UPSTREAMS]: Array<{
        status: {
            ahead: number
            behind: number
        }
        remote: string | undefined
        name: string
    }>
    [IpcAction.OPEN_REPO]: {
        opened: boolean
        path: string
        status: null | RepoStatus
    } | null
    [IpcAction.LOAD_COMMIT]: CommitObj
    [IpcAction.LOAD_PATCHES_WITHOUT_HUNKS]: PatchObj[]
    [IpcAction.LOAD_HUNKS]: {
        path: string
        hunks: HunkObj[] | false
    }
    [IpcAction.SHOW_STASH]: PatchObj[]
    [IpcAction.CHECKOUT_BRANCH]: false | HeadBranchObj
    [IpcAction.REFRESH_WORKDIR]: {
        unstaged: number
        staged: number
        status: RepoStatus
    }
    [IpcAction.GET_CHANGES]: {
        staged: PatchObj[]
        unstaged: PatchObj[]
    }
    [IpcAction.STAGE_FILE]: boolean
    [IpcAction.UNSTAGE_FILE]: boolean
    [IpcAction.STAGE_ALL]: number
    [IpcAction.UNSTAGE_ALL]: number
    [IpcAction.COMMIT]: CommitObj
    [IpcAction.PULL]: boolean
    [IpcAction.PUSH]: boolean
    [IpcAction.SET_UPSTREAM]: boolean
    [IpcAction.CREATE_BRANCH]: boolean
    [IpcAction.CREATE_BRANCH_FROM_REF]: boolean
    [IpcAction.DELETE_REF]: boolean
    [IpcAction.DELETE_REMOTE_REF]: boolean
    [IpcAction.RENAME_LOCAL_BRANCH]: boolean
    [IpcAction.FIND_FILE]: string[]
    [IpcAction.OPEN_COMPARE_REVISIONS]: PatchObj[]
    [IpcAction.REMOTES]: {
        name: string
        pushTo: string | null
        pullFrom: string
    }[]
    [IpcAction.RESOLVE_CONFLICT]: boolean
    [IpcAction.EDIT_REMOTE]: boolean
    [IpcAction.NEW_REMOTE]: boolean
    [IpcAction.FETCH]: boolean
    [IpcAction.SAVE_SETTINGS]: boolean
    [IpcAction.GET_SETTINGS]: AppConfig
    [IpcAction.REPO_PROFILE]: boolean
    [IpcAction.FILE_DIFF_AT]: PatchObj | false
    [IpcAction.CREATE_TAG]: boolean
    [IpcAction.PARSE_REVSPEC]: string
    [IpcAction.LOAD_STASHES]: StashObj[]
    [IpcAction.GET_COMMIT_GPG_SIGN]: false | {
        signature: {
            data: string
            verified: boolean
        }
        sha: string
    }
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
    type: "" | "-" | "+"
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
    status: DiffDelta
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
    signature?: {
        verified: boolean
        data: string
    }
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

export type HeadBranchObj = BranchObj & {commit: CommitObj}

export const enum RefType {
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
    remote?: string | undefined
    type: RefType
};

export type BranchesObj = {
    remote: BranchObj[]
    local: BranchObj[]
    tags: BranchObj[]
};
export type StashObj = {
    index: number
    msg: string
    oid: string
};
interface LoadCommitsParamSha {
    sha: string
}
interface LoadCommitsParamBranch {
    branch: string
}
type LoadFileCommitsParam = {
    /** SHA of last fetched commit */
    cursor: string | undefined
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
    cursor?: string | undefined
};
type LoadFileCommitsReturn = {
    commits: Array<LoadCommitReturn & {
        status?: DiffDelta
        path: string
    }>
    branch: string
    cursor?: string
    filePath: string
};

export const enum Locks {
    MAIN,
    BRANCH_LIST,
    COMMIT_LIST,
}
