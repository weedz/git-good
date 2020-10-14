export enum DialogTypes {
    NEW_BRANCH,
    RENAME_BRANCH,
    COMPARE,
    SET_UPSTREAM,
    BLAME,
}

export type DialogProps = {
    [DialogTypes.NEW_BRANCH]: BranchProps
    [DialogTypes.RENAME_BRANCH]: BranchProps
    [DialogTypes.COMPARE]: CompareProps
    [DialogTypes.SET_UPSTREAM]: SetUpstreamProps
    [DialogTypes.BLAME]: BranchProps
}

export type CompareProps = {
    default?: {
        from: string
        to: string
    }
    confirmCb: (from: string, to: string) => void
    cancelCb: () => void
}

export type BlameProps = {
    defaultValue?: string
    confirmCb: (file: string) => void
    cancelCb: () => void
};

export type BranchProps = {
    defaultValue?: string
    confirmCb: (branchName: string) => void
    cancelCb: () => void
};

export type SetUpstreamProps = {
    default: {
        remote: string
        branch: string
    }
    confirmCb: (remote: string, upstream: string) => void
    cancelCb: () => void
};
