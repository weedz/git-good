import { AppConfig } from "src/Data/Config";

export enum DialogTypes {
    NEW_BRANCH,
    RENAME_BRANCH,
    COMPARE,
    SET_UPSTREAM,
    EDIT_REMOTE,
    ADD_REMOTE,
    SETTINGS,
}

export type DialogProps = {
    [DialogTypes.NEW_BRANCH]: BranchProps
    [DialogTypes.RENAME_BRANCH]: BranchProps
    [DialogTypes.COMPARE]: CompareProps
    [DialogTypes.SET_UPSTREAM]: SetUpstreamProps
    [DialogTypes.EDIT_REMOTE]: RemoteProps
    [DialogTypes.ADD_REMOTE]: Omit<RemoteProps, "data">
    [DialogTypes.SETTINGS]: SettingsProps
}

export type CompareProps = {
    default?: {
        from: string
        to: string
    }
    confirmCb: (from: string, to: string) => void
    cancelCb: () => void
}

export type RemoteProps = {
    data: {
        pullFrom: string
        pushTo?: string
        name: string
    }
    confirmCb: (data: RemoteProps["data"]) => void
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

export type SettingsProps = {
    confirmCb: (settings: AppConfig) => void
    cancelCb: () => void
}
