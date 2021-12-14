import { AnyComponent, Component, JSX } from "preact";
import { PureComponent } from "preact/compat";
import { createStore, PartialStoreListener } from "@weedzcokie/store";
import { DialogProps, DialogTypes } from "../../Components/Dialog/types";
import { unselectLink } from "../../Components/Link";
import { IpcAction, BranchesObj, BranchObj, PatchObj, Locks, RepoStatus, IpcActionParams, IpcActionReturn, HeadBranchObj, StashObj } from "../Actions";
import { registerHandler, ipcSendMessage, ipcGetData } from "./IPC";
import { Notification } from "../../Components/Notification";
import { AppConfig } from "../Config";

export type DialogWindow = {
    type: DialogTypes
    props: DialogProps[DialogTypes]
}

export enum NotificationPosition {
    DEFAULT,
}

export type StoreType = {
    repo: null | {
        path: string
        status: null | RepoStatus
    }
    branches: BranchesObj
    stash: StashObj[]
    head: HeadBranchObj | undefined
    remotes: IpcActionReturn[IpcAction.REMOTES]
    heads: Record<string, BranchObj[]>
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
    diffOptions: {
        ignoreWhitespace: boolean
    }
    notifications: Record<NotificationPosition, Map<string, Notification>>
    uiConfig: AppConfig["ui"] | undefined
};

const store = createStore<StoreType>({
    repo: null,
    branches: {
        remote: [],
        local: [],
        tags: []
    },
    stash: [],
    head: undefined,
    remotes: [],
    heads: {},
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
    diffOptions: {
        ignoreWhitespace: true
    },
    notifications: {
        [NotificationPosition.DEFAULT]: new Map(),
    },
    uiConfig: undefined,
});
type StoreKeys = keyof StoreType;

export const Store = store.Store;
export const updateStore = store.updateStore;

export const contextMenuState: {data: Record<string, string>} = {
    data: {}
};

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

export function notify(notificationData: {position?: NotificationPosition, title: string, body?: null | string | AnyComponent | JSX.Element, time?: number, classList?: string[]}) {
    const position = notificationData.position || NotificationPosition.DEFAULT;
    const notification = new Notification(notificationData.title, notificationData.body || null, notificationData.classList || [], deleteNotification[position], notificationData.time ?? 5000);

    Store.notifications[position].set(notification.id, notification);
    store.updateStore({
        notifications: Store.notifications
    });

    return notification;
}
const deleteNotification: {[K in NotificationPosition]: (id: string) => void} = {
    [NotificationPosition.DEFAULT]: (id) => Store.notifications[NotificationPosition.DEFAULT].delete(id) && store.updateStore({ notifications: Store.notifications }),
}

// Lock CommitList UI when loading commit info
store.subscribe("diffPaneSrc", sha => {
    if (sha) {
        setLock(Locks.COMMIT_LIST);
    }
});

// TODO: Most of these functions should probably be in Renderer/IPC.ts or Renderer/index.ts

export function openRepo(repoPath: IpcActionParams[IpcAction.OPEN_REPO]) {
    setLock(Locks.MAIN);
    ipcSendMessage(IpcAction.OPEN_REPO, repoPath);
}

export function resolveConflict(path: string) {
    ipcSendMessage(IpcAction.RESOLVE_CONFLICT, {path});
}

export function checkoutBranch(branch: string) {
    setLock(Locks.MAIN);
    ipcSendMessage(IpcAction.CHECKOUT_BRANCH, branch);
}

export function openFile(params: (
    {sha: string} |
    {workDir: true, type: "staged" | "unstaged"} |
    {compare: true}
) & {patch: PatchObj}) {
    const currentFile: StoreType["currentFile"] = {
        patch: params.patch,
    };
    if ("sha" in params) {
        currentFile.commitSHA = params.sha;
    }
    if (!params.patch.hunks) {
        if ("sha" in params) {
            ipcSendMessage(IpcAction.LOAD_HUNKS, {
                sha: params.sha,
                path: params.patch.actualFile.path,
            });
        } else if ("compare" in params) {
            ipcSendMessage(IpcAction.LOAD_HUNKS, {
                compare: true,
                path: params.patch.actualFile.path,
            });
        } else {
            ipcSendMessage(IpcAction.LOAD_HUNKS, {
                workDir: true,
                path: params.patch.actualFile.path,
                type: params.type
            });
        }
    }
    store.updateStore({
        currentFile
    });
}
export function closeFile() {
    store.updateStore({
        currentFile: null
    });
    unselectLink("files");
}
export function abortRebase() {
    ipcSendMessage(IpcAction.ABORT_REBASE, null);
}
export function continueRebase() {
    ipcSendMessage(IpcAction.CONTINUE_REBASE, null);
}

export function setLock(lock: Locks) {
    store.updateStore({locks: {...Store.locks, [lock]: true}});
}
export function clearLock(lock: Locks) {
    store.updateStore({locks: {...Store.locks, [lock]: false}});
}

export function createBranchFromSha(sha: string, name: string) {
    setLock(Locks.BRANCH_LIST);
    return ipcGetData(IpcAction.CREATE_BRANCH, {
        sha,
        name,
    });
}
export function createBranchFromRef(ref: string, name: string) {
    setLock(Locks.BRANCH_LIST);
    return ipcGetData(IpcAction.CREATE_BRANCH_FROM_REF, {
        ref,
        name,
    });
}
export function deleteBranch(name: string) {
    setLock(Locks.BRANCH_LIST);
    return ipcGetData(IpcAction.DELETE_REF, {
        name
    });
}
export function renameLocalBranch(oldName: string, newName: string) {
    setLock(Locks.BRANCH_LIST);
    return ipcGetData(IpcAction.RENAME_LOCAL_BRANCH, {
        ref: oldName,
        name: newName
    });
}

export function deleteTag(name: string, remote?: boolean) {
    setLock(Locks.BRANCH_LIST);
    return ipcGetData(IpcAction.DELETE_TAG, {
        name,
        remote,
    });
}

export function deleteRemoteBranch(name: string) {
    setLock(Locks.BRANCH_LIST);
    return ipcGetData(IpcAction.DELETE_REMOTE_REF, name);
}

export function setUpstream(local: string, remote: string | null) {
    return ipcGetData(IpcAction.SET_UPSTREAM, {
        local,
        remote: remote || null
    });
}

export function commit(params: IpcActionParams[IpcAction.COMMIT]) {
    return ipcGetData(IpcAction.COMMIT, params);
}

export function openDialogWindow<T extends DialogTypes>(type: T, props: DialogProps[T]) {
    store.updateStore({
        dialogWindow: {
            type,
            props
        }
    });
}
export function closeDialogWindow() {
    store.updateStore({
        dialogWindow: null
    });
}

export function openFileHistory(file: string, sha?: string) {
    ipcSendMessage(IpcAction.LOAD_FILE_COMMITS, {file, cursor: sha, startAtCursor: true});
    store.updateStore({
        currentFile: {
            patch: {
                status: 0,
                hunks: [],
                newFile: { path: "", size: 0, mode: 0, flags: 0 },
                oldFile: { path: "", size: 0, mode: 0, flags: 0 },
                lineStats: { total_context: 0, total_additions: 0, total_deletions: 0 },
                actualFile: { path: file, size: 0, mode: 0, flags: 0 }
            },
            commitSHA: sha
        },
    });
}

export async function showStash(index: number) {
    const patches = await ipcGetData(IpcAction.SHOW_STASH, index);
    store.updateStore({
        comparePatches: patches
    });
}

export function setDiffpaneSrc(diffPaneSrc: StoreType["diffPaneSrc"]) {
    store.updateStore({
        diffPaneSrc
    });
}
