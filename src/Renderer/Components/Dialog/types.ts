import { type JSX } from "preact";
import { type AppConfig } from "../../../Common/Config.js";

export const enum DialogTypes {
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
    CLONE_REPOSITORY,
    INIT_REPOSITORY,
    FILE_HISTORY,
}

export type DialogProps = {
    [DialogTypes.NEW_BRANCH]: BranchProps;
    [DialogTypes.RENAME_BRANCH]: BranchProps;
    [DialogTypes.COMPARE]: CompareProps;
    [DialogTypes.SET_UPSTREAM]: SetUpstreamProps;
    [DialogTypes.EDIT_REMOTE]: RemoteProps;
    [DialogTypes.ADD_REMOTE]: Omit<RemoteProps, "data">;
    [DialogTypes.SETTINGS]: SettingsProps;
    [DialogTypes.CREATE_TAG]: CreateTagProps;
    [DialogTypes.PUSH_TAG]: PushTagProps;
    [DialogTypes.VIEW_COMMIT]: PushTagProps;
    [DialogTypes.CLONE_REPOSITORY]: CloneRepoProps;
    [DialogTypes.INIT_REPOSITORY]: InitRepoProps;
    [DialogTypes.FILE_HISTORY]: FileHistoryProps;
};

interface DialogBaseProps {
    cancelCb?: (e: JSX.TargetedMouseEvent<HTMLButtonElement>) => void;
}

export interface CompareProps extends DialogBaseProps {
    data?: {
        from: string;
        to: string;
    };
    confirmCb: (from: string, to: string) => void;
}

export interface ViewCommitProps extends DialogBaseProps {
    data?: {
        sha: string;
    };
    confirmCb: (sha: string) => void;
}

export interface RemoteProps extends DialogBaseProps {
    data: {
        pullFrom: string;
        pushTo: string | null;
        name: string;
    };
    confirmCb: (data: RemoteProps["data"]) => void;
}

export interface BranchProps extends DialogBaseProps {
    data: string | undefined;
    confirmCb: (branchName: string, checkout: boolean) => void;
}

export interface SetUpstreamProps extends DialogBaseProps {
    data: {
        remote: string;
        branch: string;
    };
    confirmCb: (remote: string, upstream: string) => void;
}

export interface SettingsProps extends DialogBaseProps {
    confirmCb: (settings: AppConfig) => void;
}

export interface CreateTagProps extends DialogBaseProps {
    confirmCb: (tag: { name: string; annotation?: string; }) => void;
}
export interface PushTagProps extends DialogBaseProps {
    confirmCb: (remote: string) => void;
}
interface CloneRepoProps extends DialogBaseProps {
    confirmCb: (data: { source: string; target: string; }) => void;
}
interface InitRepoProps extends DialogBaseProps {
    confirmCb: (target: string) => void;
}
interface FileHistoryProps extends DialogBaseProps {
    confirmCb: (filePath: string) => void;
}
