import type { DiffOptions } from "nodegit";
import type { AppConfig } from "./Config.js";
import { DiffDelta } from "./Utils.js";

export type IpcPayload<T extends IpcAction> =
  & {
    id?: number;
    action: T;
  }
  & (
    { data: IpcActionReturn[T]; } | { error: string; }
  );

export type IpcActionReturnOrError<A extends IpcAction> = IpcActionReturn[A] | Error;
export type AsyncIpcActionReturnOrError<A extends IpcAction> = Promise<IpcActionReturnOrError<A>>;

export type IpcResponse<T extends IpcAction> = IpcActionReturnOrError<T>;

export const enum IpcAction {
  INIT = 0,
  LOAD_COMMITS,
  LOAD_FILE_COMMITS,
  LOAD_BRANCHES,
  LOAD_HEAD,
  LOAD_UPSTREAMS,
  LOAD_COMMIT,
  LOAD_PATCHES_WITHOUT_HUNKS,
  LOAD_HUNKS,
  SHOW_STASH,
  CHECKOUT_BRANCH,
  GET_CHANGES,
  STAGE_FILE,
  UNSTAGE_FILE,
  STAGE_ALL,
  UNSTAGE_ALL,
  COMMIT,
  PUSH,
  SET_UPSTREAM,
  CREATE_BRANCH,
  CREATE_BRANCH_FROM_REF,
  RENAME_LOCAL_BRANCH,
  FIND_FILE,
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
  LOAD_STASHES,
  GET_COMMIT_GPG_SIGN,
  LOAD_TREE_AT_COMMIT,
  CONTINUE_REBASE,
  OPEN_IN_TERMINAL,
  OPEN_IN_FILE_MANAGER,
  REQUEST_OPEN_REPO,
  GET_RECENT_REPOSITORIES,
  OPEN_REPOSITORY,
  PULL,
  GET_UNSTAGED_CHANGES,
  GET_STAGED_CHANGES,
}

export type IpcActionParams = {
  [IpcAction.INIT]: null;
  [IpcAction.LOAD_COMMITS]: LoadCommitsParam;
  [IpcAction.LOAD_FILE_COMMITS]: LoadFileCommitsParam;
  [IpcAction.LOAD_BRANCHES]: null;
  [IpcAction.LOAD_HEAD]: null;
  [IpcAction.LOAD_UPSTREAMS]: null;
  [IpcAction.LOAD_COMMIT]: string | null;
  [IpcAction.LOAD_PATCHES_WITHOUT_HUNKS]: {
    sha: string;
  };
  [IpcAction.LOAD_HUNKS]:
  & (
    {
      file: string;
      sha: string;
    } | {
      workDir: boolean;
      type: "staged" | "unstaged";
    } | {
      sha: string;
    } | {
      compare: boolean;
    }
  )
  & {
    path: string;
  };
  [IpcAction.SHOW_STASH]: number;
  [IpcAction.CHECKOUT_BRANCH]: string;
  [IpcAction.GET_CHANGES]: null;
  [IpcAction.STAGE_FILE]: string;
  [IpcAction.UNSTAGE_FILE]: string;
  [IpcAction.STAGE_ALL]: null;
  [IpcAction.UNSTAGE_ALL]: null;
  [IpcAction.COMMIT]: {
    amend: boolean | undefined;
    message: {
      summary: string;
      body: string;
    };
  };
  [IpcAction.PUSH]: null | {
    force?: boolean;
    remote: string;
    localBranch: string;
  };
  [IpcAction.SET_UPSTREAM]: {
    local: string;
    remote: string | null;
  };
  [IpcAction.CREATE_BRANCH]: {
    sha: string;
    name: string;
    checkout?: boolean;
  };
  [IpcAction.CREATE_BRANCH_FROM_REF]: {
    ref: string;
    name: string;
    checkout?: boolean;
  };
  [IpcAction.RENAME_LOCAL_BRANCH]: {
    ref: string;
    name: string;
  };
  [IpcAction.FIND_FILE]: string;
  [IpcAction.REMOTES]: null;
  [IpcAction.RESOLVE_CONFLICT]: { path: string; };
  [IpcAction.EDIT_REMOTE]: { oldName: string; name: string; pullFrom: string; pushTo: string | null; };
  [IpcAction.NEW_REMOTE]: { name: string; pullFrom: string; pushTo: string | null; };
  [IpcAction.FETCH]: null | { remote: string; };
  [IpcAction.SAVE_SETTINGS]: AppConfig;
  [IpcAction.GET_SETTINGS]: null;
  [IpcAction.REPO_PROFILE]: { action: "save" | "remove"; profileId: number; };
  [IpcAction.FILE_DIFF_AT]: {
    file: string;
    sha: string;
    options?: DiffOptions;
  };
  [IpcAction.CREATE_TAG]: {
    name: string;
    from: string;
    fromCommit: boolean;
    annotation?: string;
  };
  [IpcAction.LOAD_STASHES]: null;
  [IpcAction.GET_COMMIT_GPG_SIGN]: string;
  [IpcAction.LOAD_TREE_AT_COMMIT]: string;
  [IpcAction.CONTINUE_REBASE]: null;
  [IpcAction.OPEN_IN_TERMINAL]: null;
  [IpcAction.OPEN_IN_FILE_MANAGER]: null;
  [IpcAction.REQUEST_OPEN_REPO]: null;
  [IpcAction.GET_RECENT_REPOSITORIES]: null;
  [IpcAction.OPEN_REPOSITORY]: string;
  [IpcAction.PULL]: null;
  [IpcAction.GET_UNSTAGED_CHANGES]: null;
  [IpcAction.GET_STAGED_CHANGES]: null;
};

export type IpcActionReturn = {
  [IpcAction.INIT]: null;
  [IpcAction.LOAD_COMMITS]: null | LoadCommitsReturn;
  [IpcAction.LOAD_FILE_COMMITS]: null | LoadFileCommitsReturn;
  [IpcAction.LOAD_BRANCHES]: BranchesObj;
  [IpcAction.LOAD_HEAD]: null | HeadBranchObj;
  [IpcAction.LOAD_UPSTREAMS]: Array<{
    status: {
      ahead: number;
      behind: number;
    };
    remote: string | undefined;
    name: string;
  }>;
  [IpcAction.LOAD_COMMIT]: CommitObj;
  [IpcAction.LOAD_PATCHES_WITHOUT_HUNKS]: PatchObj[];
  [IpcAction.LOAD_HUNKS]: {
    path: string;
    hunks: HunkObj[] | false;
  };
  [IpcAction.SHOW_STASH]: PatchObj[];
  [IpcAction.CHECKOUT_BRANCH]: false | HeadBranchObj;
  [IpcAction.GET_CHANGES]: {
    staged: PatchObj[];
    unstaged: PatchObj[];
  };
  [IpcAction.STAGE_FILE]: boolean;
  [IpcAction.UNSTAGE_FILE]: boolean;
  [IpcAction.STAGE_ALL]: number;
  [IpcAction.UNSTAGE_ALL]: number;
  [IpcAction.COMMIT]: CommitObj;
  [IpcAction.PUSH]: boolean;
  [IpcAction.SET_UPSTREAM]: boolean;
  [IpcAction.CREATE_BRANCH]: boolean;
  [IpcAction.CREATE_BRANCH_FROM_REF]: boolean;
  [IpcAction.RENAME_LOCAL_BRANCH]: boolean;
  [IpcAction.FIND_FILE]: string[];
  [IpcAction.REMOTES]: {
    name: string;
    pushTo: string | null;
    pullFrom: string;
  }[];
  [IpcAction.RESOLVE_CONFLICT]: boolean;
  [IpcAction.EDIT_REMOTE]: boolean;
  [IpcAction.NEW_REMOTE]: boolean;
  [IpcAction.FETCH]: boolean;
  [IpcAction.SAVE_SETTINGS]: boolean;
  [IpcAction.GET_SETTINGS]: AppConfig;
  [IpcAction.REPO_PROFILE]: boolean;
  [IpcAction.FILE_DIFF_AT]: PatchObj | false;
  [IpcAction.CREATE_TAG]: boolean;
  [IpcAction.LOAD_STASHES]: StashObj[];
  [IpcAction.GET_COMMIT_GPG_SIGN]: false | {
    signature: {
      data: string;
      verified: boolean;
    };
    sha: string;
  };
  [IpcAction.LOAD_TREE_AT_COMMIT]: string[];
  [IpcAction.CONTINUE_REBASE]: boolean;
  [IpcAction.OPEN_IN_TERMINAL]: null;
  [IpcAction.OPEN_IN_FILE_MANAGER]: null;
  [IpcAction.REQUEST_OPEN_REPO]: null; // FIXME: Should we return something here?
  [IpcAction.GET_RECENT_REPOSITORIES]: string[];
  [IpcAction.OPEN_REPOSITORY]: boolean;
  [IpcAction.PULL]: boolean;
  [IpcAction.GET_UNSTAGED_CHANGES]: PatchObj[];
  [IpcAction.GET_STAGED_CHANGES]: PatchObj[];
};

export type RepoStatus = {
  merging: boolean;
  rebasing: boolean;
  reverting: boolean;
  bisecting: boolean;
  state: number; // Repository.STATE
};

type LineStats = {
  total_context: number;
  total_additions: number;
  total_deletions: number;
};
export type FileObj = {
  path: string;
  size: number;
  mode: number;
  flags: number;
};

export type LineObj = {
  type: "" | "-" | "+";
  oldLineno: number;
  newLineno: number;
  content: string;
  offset?: number;
  length?: number;
};
export type HunkObj = {
  header: string;
  lines: LineObj[];
  // old: number
  // new: number
};
export type PatchObj = {
  status: DiffDelta;
  hunks?: HunkObj[];
  newFile: FileObj;
  oldFile: FileObj;
  actualFile: FileObj;
  similarity?: number;
  lineStats: LineStats;
};
type DiffObj = {
  patches?: PatchObj[];
};
type AuthorObj = {
  name: string;
  email: string;
};
export type CommitObj = {
  parents: {
    sha: string;
  }[];
  signature?: {
    verified: boolean;
    data: string;
  };
  sha: string;
  diff?: DiffObj[];
  authorDate: number;
  date: number;
  message: {
    summary: string;
    body: string;
  };
  author: AuthorObj;
  committer: AuthorObj;
};

export type HeadBranchObj = BranchObj & { commit: CommitObj; };

export const enum RefType {
  LOCAL,
  TAG,
  REMOTE,
  NOTE,
}

export type BranchObj = {
  name: string;
  headSHA: string;
  normalizedName: string;
  status?: {
    ahead: number;
    behind: number;
  };
  remote?: string | undefined;
  type: RefType;
};

export type BranchesObj = {
  remote: BranchObj[];
  local: BranchObj[];
  tags: BranchObj[];
};
export type StashObj = {
  index: number;
  msg: string;
  oid: string;
};
interface LoadCommitsParamSha {
  sha: string;
}
interface LoadCommitsParamBranch {
  branch: string;
}
type LoadFileCommitsParam = {
  /** SHA of last fetched commit */
  cursor?: string;
  startAtCursor?: boolean;
  num?: number;
  file: string;
};
type LoadCommitsParam = {
  /** SHA of last fetched commit */
  cursor?: string;
  startAtCursor?: boolean;
  num?: number;
} & (LoadCommitsParamBranch | LoadCommitsParamSha | { history: true; });
export type LoadCommitReturn = {
  sha: string;
  parents: string[];
  message: string;
  date: number;
  author: {
    name: string;
    email: string;
  };
};
export type LoadCommitsReturn = {
  commits: LoadCommitReturn[];
  branch: string;
  cursor: string;
};
export type LoadFileCommitsReturn = {
  commits: Array<
    LoadCommitReturn & {
      status?: DiffDelta;
      path: string;
    }
  >;
  branch: string;
  cursor?: string;
  filePath: string;
};

export const enum Locks {
  MAIN,
  BRANCH_LIST,
  COMMIT_LIST,
}
