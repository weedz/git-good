import { createStore, type PartialStoreListener } from "@weedzcokie/store";
import { type AnyComponent, Component, type JSX } from "preact";
import type { BranchesObj, BranchObj, HeadBranchObj, IpcActionReturn, IpcResponse, PatchObj, RepoStatus, StashObj } from "../../Common/Actions.js";
import { IpcAction, Locks } from "../../Common/Actions.js";
import { HEAD_REF } from "../../Common/Branch.js";
import { type AppConfig } from "../../Common/Config.js";
import { type NotificationInit, NotificationPosition } from "../../Common/WindowEventTypes.js";
import { type DialogProps, DialogTypes } from "../Components/Dialog/types.js";
import { Notification } from "../Components/Notification/index.js";
import { shallowDiffers } from "../utils.js";
import { ipcGetData, registerHandler } from "./IPC.js";

type DialogWindow<T extends DialogTypes = DialogTypes> = {
    type: T;
    props: DialogProps[T];
};

export type StoreType = {
    repo: null | {
        path: string;
    };
    repoStatus: null | RepoStatus;
    workDir: {
        staged: number;
        unstaged: number;
    };
    branches: null | BranchesObj;
    stash: StashObj[];
    head: HeadBranchObj | null;
    remotes: IpcActionReturn[IpcAction.REMOTES];
    heads: Map<string, BranchObj[]>;
    currentFile: null | {
        commitSHA?: string | undefined;
        patch: PatchObj;
    };
    locks: Record<Locks, boolean>;
    dialogWindow: null | DialogWindow;
    selectedBranch: undefined | string;
    diffPaneSrc: string | null;
    viewChanges: null;
    comparePatches: PatchObj[];
    commitMsg: {
        summary: string;
        body: string;
    };
    diffUi: {
        sideBySide: boolean;
    };
    notifications: Record<NotificationPosition, Map<number, Notification>>;
    appConfig: AppConfig | undefined;
    diffOptions: AppConfig["diffOptions"];
};

export const store = createStore<StoreType>({
    repo: null,
    repoStatus: null,
    workDir: {
        staged: 0,
        unstaged: 0,
    },
    branches: null,
    stash: [],
    head: null,
    remotes: [],
    heads: new Map(),
    currentFile: null,
    locks: {
        [Locks.MAIN]: false,
        [Locks.BRANCH_LIST]: false,
        [Locks.COMMIT_LIST]: false,
    },
    dialogWindow: null,
    selectedBranch: HEAD_REF,
    diffPaneSrc: "",
    viewChanges: null,
    comparePatches: [],
    commitMsg: { summary: "", body: "" },
    diffUi: {
        sideBySide: false,
    },
    notifications: {
        [NotificationPosition.DEFAULT]: new Map(),
    },
    appConfig: undefined,
    diffOptions: {
        ignoreWhitespace: true,
    },
});
type StoreKeys = keyof StoreType;

export const Store = store.Store;

export abstract class StoreComponent<P = unknown, S = unknown> extends Component<P, S> {
    listeners: Array<() => void> = [];

    listen<T extends StoreKeys>(key: T, cb: PartialStoreListener<StoreType, T> = () => this.forceUpdate()) {
        this.listeners.push(store.subscribe(key, cb));
    }
    registerHandler<T extends IpcAction>(action: T, cb: (arg: IpcResponse<T>) => void) {
        this.listeners.push(registerHandler(action, cb));
    }

    componentWillUnmount() {
        for (let i = 0, len = this.listeners.length; i < len; ++i) {
            this.listeners[i]();
        }
    }
}
export abstract class PureStoreComponent<P = unknown, S = unknown> extends StoreComponent<P, S> {
    shouldComponentUpdate(nextProps: Readonly<P>, nextState: Readonly<S>): boolean {
        return shallowDiffers(this.props, nextProps) || shallowDiffers(this.state, nextState);
    }
}

export function notify(notificationData: NotificationInit & { body?: null | string | AnyComponent | JSX.Element; }, _?: unknown): Notification {
    const position = notificationData.position || NotificationPosition.DEFAULT;
    const notification = new Notification(
        notificationData.title,
        notificationData.body || null,
        notificationData.classList || [],
        deleteNotification[position],
        notificationData.time ?? 5000,
    );

    Store.notifications[position].set(notification.id, notification);
    store.triggerStoreUpdate("notifications");

    return notification;
}
const deleteNotification: { [K in NotificationPosition]: (id: number) => void; } = {
    [NotificationPosition.DEFAULT]: (id) => Store.notifications[NotificationPosition.DEFAULT].delete(id) && store.triggerStoreUpdate("notifications"),
};

export async function saveAppConfig(appConfig: AppConfig) {
    if (appConfig && await ipcGetData(IpcAction.SAVE_SETTINGS, appConfig)) {
        store.updateStore("appConfig", appConfig);
        if (appConfig.diffOptions !== Store.diffOptions) {
            store.updateStore("diffOptions", appConfig.diffOptions);
        }
    }
}

// TODO: Most of these functions should probably be in Renderer/IPC.ts or Renderer/index.ts

export function createBranchFromSha(sha: string, name: string, checkout: boolean) {
    return ipcGetData(IpcAction.CREATE_BRANCH, {
        sha,
        name,
        checkout,
    });
}
export function createBranchFromRef(ref: string, name: string, checkout: boolean) {
    return ipcGetData(IpcAction.CREATE_BRANCH_FROM_REF, {
        ref,
        name,
        checkout,
    });
}
export function renameLocalBranch(oldName: string, newName: string) {
    return ipcGetData(IpcAction.RENAME_LOCAL_BRANCH, {
        ref: oldName,
        name: newName,
    });
}

export function setUpstream(local: string, remote: string | null) {
    return ipcGetData(IpcAction.SET_UPSTREAM, {
        local,
        remote: remote || null,
    });
}

export function setLock(lock: Locks) {
    store.mergeUpdateStore({
        locks: { [lock]: true },
    });
}
export function clearLock(lock: Locks) {
    store.mergeUpdateStore({
        locks: { [lock]: false },
    });
}
export function lockChanged<L extends Locks>(lock: L, locks: Partial<StoreType["locks"]>): boolean {
    return locks[lock] !== undefined && locks[lock] !== Store.locks[lock];
}

export function openDialogWindow<T extends DialogTypes>(type: T, props: DialogProps[T]) {
    if (!props.cancelCb) {
        props.cancelCb = closeDialogWindow;
    }
    store.updateStore("dialogWindow", {
        type,
        props,
    });
}
export function closeDialogWindow() {
    store.updateStore("dialogWindow", null);
}

export function setDiffpaneSrc(diffPaneSrc: StoreType["diffPaneSrc"]) {
    // Lock CommitList UI when loading commit info
    setLock(Locks.COMMIT_LIST);

    store.updateStore("diffPaneSrc", diffPaneSrc);
}
