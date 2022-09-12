import { createStore, PartialStoreListener } from "@weedzcokie/store";
import { AnyComponent, Component, JSX } from "preact";
import { PureComponent } from "preact/compat";
import { BranchesObj, BranchObj, HeadBranchObj, IpcAction, IpcActionReturn, Locks, PatchObj, RepoStatus, StashObj } from "../../Common/Actions";
import { AppConfig } from "../../Common/Config";
import { NotificationInit, NotificationPosition } from "../../Common/WindowEventTypes";
import { DialogProps, DialogTypes } from "../Components/Dialog/types";
import { Notification } from "../Components/Notification";
import { ipcGetData, registerHandler } from "./IPC";

export type DialogWindow = {
    type: DialogTypes
    props: DialogProps[DialogTypes]
}

export type StoreType = {
    repo: null | {
        path: string
    }
    repoStatus: null | RepoStatus
    workDir: {
        staged: number
        unstaged: number
    }
    branches: null | BranchesObj
    stash: StashObj[]
    head: HeadBranchObj | null
    remotes: IpcActionReturn[IpcAction.REMOTES]
    heads: Map<string, BranchObj[]>
    currentFile: null | {
        commitSHA?: string | undefined
        patch: PatchObj
    }
    locks: Record<Locks, boolean>
    dialogWindow: null | DialogWindow
    selectedBranch: {branch?: string, history?: boolean}
    diffPaneSrc: string | null
    viewChanges: null
    comparePatches: PatchObj[]
    commitMsg: {
        summary: string
        body: string
    }
    diffUi: {
        sideBySide: boolean
    }
    notifications: Record<NotificationPosition, Map<number, Notification>>
    appConfig: AppConfig | undefined
    diffOptions: AppConfig["diffOptions"]
};

const store = createStore<StoreType>({
    repo: null,
    repoStatus: null,
    workDir: {
        staged: 0,
        unstaged: 0
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
    selectedBranch: {branch: "HEAD"},
    diffPaneSrc: "",
    viewChanges: null,
    comparePatches: [],
    commitMsg: {summary: "", body: ""},
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
export const updateStore = store.updateStore;

export abstract class StoreComponent<P = unknown, S = unknown> extends Component<P, S> {
    listeners: Array<() => void> = [];

    listen<T extends StoreKeys>(key: T, cb: PartialStoreListener<StoreType, T>) {
        this.listeners.push(store.subscribe(key, cb));
    }
    registerHandler<T extends IpcAction>(action: T, cb: (arg: IpcActionReturn[T]) => void) {
        this.listeners.push(registerHandler(action, cb));
    }

    componentWillUnmount() {
        for (const unsubscribe of this.listeners) {
            unsubscribe();
        }
    }
}
export abstract class PureStoreComponent<P = unknown, S = unknown> extends PureComponent<P, S> {
    listeners: Array<() => void> = [];

    listen<T extends StoreKeys>(key: T, cb: PartialStoreListener<StoreType, T> = () => this.forceUpdate()) {
        this.listeners.push(store.subscribe(key, cb));
    }
    registerHandler<T extends IpcAction>(action: T, cb: (arg: IpcActionReturn[T]) => void) {
        this.listeners.push(registerHandler(action, cb));
    }

    componentWillUnmount() {
        for (const unsubscribe of this.listeners) {
            unsubscribe();
        }
    }
}

export function notify(notificationData: NotificationInit & {body?: null | string | AnyComponent | JSX.Element}, _?: unknown) {
    const position = notificationData.position || NotificationPosition.DEFAULT;
    const notification = new Notification(notificationData.title, notificationData.body || null, notificationData.classList || [], deleteNotification[position], notificationData.time ?? 5000);

    Store.notifications[position].set(notification.id, notification);
    updateStore({
        notifications: Store.notifications
    });

    return notification;
}
const deleteNotification: {[K in NotificationPosition]: (id: number) => void} = {
    [NotificationPosition.DEFAULT]: (id) => Store.notifications[NotificationPosition.DEFAULT].delete(id) && updateStore({ notifications: Store.notifications }),
}

export async function saveAppConfig(appConfig: AppConfig) {
    if (appConfig && await ipcGetData(IpcAction.SAVE_SETTINGS, appConfig)) {
        updateStore({ appConfig });
        if (appConfig.diffOptions !== Store.diffOptions) {
            updateStore({ diffOptions: appConfig.diffOptions });
        }
    }
}

// TODO: Most of these functions should probably be in Renderer/IPC.ts or Renderer/index.ts

export function createBranchFromSha(sha: string, name: string,  checkout: boolean) {
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
        name: newName
    });
}

export function setUpstream(local: string, remote: string | null) {
    return ipcGetData(IpcAction.SET_UPSTREAM, {
        local,
        remote: remote || null
    });
}

export function setLock(lock: Locks) {
    updateStore({locks: {...Store.locks, [lock]: true}});
}
export function clearLock(lock: Locks) {
    updateStore({locks: {...Store.locks, [lock]: false}});
}

export function openDialogWindow<T extends DialogTypes>(type: T, props: DialogProps[T]) {
    updateStore({
        dialogWindow: {
            type,
            props
        }
    });
}
export function closeDialogWindow() {
    updateStore({
        dialogWindow: null
    });
}

export function setDiffpaneSrc(diffPaneSrc: StoreType["diffPaneSrc"]) {
    // Lock CommitList UI when loading commit info
    setLock(Locks.COMMIT_LIST);

    updateStore({ diffPaneSrc });
}
