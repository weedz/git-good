import { AppConfig } from "../../Data/Config";

export enum DialogTypes {
    NEW_BRANCH,
    RENAME_BRANCH,
    COMPARE,
    SET_UPSTREAM,
    EDIT_REMOTE,
    ADD_REMOTE,
    SETTINGS,
    CREATE_TAG,
    PUSH_TAG,
    VIEW_COMMIT,
}

export type DialogProps = {
    [DialogTypes.NEW_BRANCH]: BranchProps
    [DialogTypes.RENAME_BRANCH]: BranchProps
    [DialogTypes.COMPARE]: CompareProps
    [DialogTypes.SET_UPSTREAM]: SetUpstreamProps
    [DialogTypes.EDIT_REMOTE]: RemoteProps
    [DialogTypes.ADD_REMOTE]: Omit<RemoteProps, "data">
    [DialogTypes.SETTINGS]: SettingsProps
    [DialogTypes.CREATE_TAG]: CreateTagProps
    [DialogTypes.PUSH_TAG]: PushTagProps
    [DialogTypes.VIEW_COMMIT]: PushTagProps
}

interface DialogBaseProps {
    cancelCb: () => void
}

export interface CompareProps extends DialogBaseProps {
    default?: {
        from: string
        to: string
    }
    confirmCb: (from: string, to: string) => void
}

export interface ViewCommitProps extends DialogBaseProps {
    default?: {
        sha: string
    }
    confirmCb: (sha: string) => void
}

export interface RemoteProps extends DialogBaseProps {
    data: {
        pullFrom: string
        pushTo: string | null
        name: string
    }
    confirmCb: (data: RemoteProps["data"]) => void
}

export interface BranchProps extends DialogBaseProps {
    default: string | undefined
    confirmCb: (branchName: string) => void
}

export interface SetUpstreamProps extends DialogBaseProps {
    default: {
        remote: string
        branch: string
    }
    confirmCb: (remote: string, upstream: string) => void
}

export interface SettingsProps extends DialogBaseProps {
    confirmCb: (settings: AppConfig) => void
}

export interface CreateTagProps extends DialogBaseProps {
    confirmCb: (tag: {name: string, annotation?: string}) => void
}
export interface PushTagProps extends DialogBaseProps {
    confirmCb: (remote: string) => void
}
