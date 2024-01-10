export const enum StashFLAGS {
    DEFAULT = 0,
}

export const enum ObjectTYPE {
    COMMIT = 1,
}

export const enum RevwalkSORT {
    TOPOLOGICAL = 1,
    TIME = 2,
}

export const enum DiffOPTION {
    INCLUDE_UNTRACKED = 8,
    RECURSE_UNTRACKED_DIRS = 16,
    IGNORE_WHITESPACE = 4194304,
    SHOW_UNTRACKED_CONTENT = 33554432,
}
export const enum DiffFIND {
    RENAMES = 1,
    FOR_UNTRACKED = 64,
    IGNORE_WHITESPACE = 4096,
}

export const enum ResetTYPE {
    HARD = 3,
}

export const enum StatusSHOW {
    INDEX_ONLY = 1,
    WORKDIR_ONLY = 2,
}
export const enum StatusOPT {
    INCLUDE_UNTRACKED = 1,
    RECURSE_UNTRACKED_DIRS = 16,
}

export const enum CheckoutSTRATEGY {
    FORCE = 2,
}

export const enum NodeGitErrorCODE {
    OK = 0,
}
