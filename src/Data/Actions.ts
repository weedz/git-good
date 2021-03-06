import { Diff, DiffOptions } from "nodegit";
import { AppConfig } from "./Config";

export type IpcPayload<T extends IpcAction> = {
    id?: string
    action: T
} & (
    {data: IpcActionReturn[T]} | {error: string}
);

export type IpcResponse<T extends IpcAction> = IpcActionReturn[T] | false;

export type IpcPayloadMsg<T extends IpcAction> = {result: IpcActionReturn[T]} | {error: IpcActionReturnError["msg"]};

export enum IpcAction {
    LOAD_COMMITS,
    LOAD_FILE_COMMITS,
    LOAD_BRANCHES,
    LOAD_HEAD,
    LOAD_UPSTREAMS,
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
    REPO_PROFILE,
    GET_SETTINGS,
    FILE_DIFF_AT,
    CREATE_TAG,
    DELETE_TAG,
    PARSE_REVSPEC,
}

export type IpcActionParams = {
    [IpcAction.LOAD_COMMITS]: LoadCommitsParam
    [IpcAction.LOAD_FILE_COMMITS]: LoadFileCommitsParam
    [IpcAction.LOAD_BRANCHES]: null
    [IpcAction.LOAD_HEAD]: null
    [IpcAction.LOAD_UPSTREAMS]: null
    [IpcAction.OPEN_REPO]: string | null
    [IpcAction.LOAD_COMMIT]: string | null
    [IpcAction.LOAD_PATCHES_WITHOUT_HUNKS]: {
        sha: string
        options: DiffOptions | undefined
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
    [IpcAction.REFRESH_WORKDIR]: null | {
        flags?: DiffOptions["flags"]
    }
    [IpcAction.GET_CHANGES]: null
    [IpcAction.STAGE_FILE]: string
    [IpcAction.UNSTAGE_FILE]: string
    [IpcAction.DISCARD_FILE]: string
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
    [IpcAction.EDIT_REMOTE]: {oldName: string, name: string, pullFrom: string, pushTo: string | null}
    [IpcAction.NEW_REMOTE]: {name: string, pullFrom: string, pushTo: string | null}
    [IpcAction.REMOVE_REMOTE]: {name: string}
    [IpcAction.FETCH]: null | {remote: string}
    [IpcAction.SAVE_SETTINGS]: AppConfig
    [IpcAction.GET_SETTINGS]: string | null
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
    [IpcAction.DELETE_TAG]: {
        name: string
        remote: boolean | undefined
    }
    [IpcAction.PARSE_REVSPEC]: string
};

export type IpcActionReturn = {
    [IpcAction.LOAD_COMMITS]: LoadCommitsReturn
    [IpcAction.LOAD_FILE_COMMITS]: LoadFileCommitsReturn
    [IpcAction.LOAD_BRANCHES]: BranchesObj
    [IpcAction.LOAD_HEAD]: HeadBranchObj
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
    [IpcAction.STAGE_FILE]: number
    [IpcAction.UNSTAGE_FILE]: number
    [IpcAction.DISCARD_FILE]: number
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
    [IpcAction.ABORT_REBASE]: RepoStatus
    [IpcAction.CONTINUE_REBASE]: RepoStatus
    [IpcAction.OPEN_COMPARE_REVISIONS]: PatchObj[]
    [IpcAction.REMOTES]: {
        name: string
        pushTo: string | null
        pullFrom: string
    }[]
    [IpcAction.RESOLVE_CONFLICT]: boolean
    [IpcAction.EDIT_REMOTE]: boolean
    [IpcAction.NEW_REMOTE]: boolean
    [IpcAction.REMOVE_REMOTE]: boolean
    [IpcAction.FETCH]: boolean
    [IpcAction.SAVE_SETTINGS]: boolean
    [IpcAction.GET_SETTINGS]: AppConfig
    [IpcAction.REPO_PROFILE]: boolean
    [IpcAction.FILE_DIFF_AT]: PatchObj | false
    [IpcAction.CREATE_TAG]: boolean
    [IpcAction.DELETE_TAG]: boolean
    [IpcAction.PARSE_REVSPEC]: string
};

export type IpcActionReturnError = {
    msg: Error
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
    remote?: string | undefined
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
    COMMIT_LIST,
}
