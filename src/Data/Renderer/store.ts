import { Component } from "preact";
import { PureComponent } from "preact/compat";
import { DialogProps, DialogTypes } from "src/Components/Dialog/types";
import Link, { unselectLink } from "src/Components/Link";
import { IpcAction, BranchesObj, BranchObj, PatchObj, Locks, RepoStatus, IpcActionParams, IpcActionReturn } from "../Actions";
import { registerHandler, ipcSendMessage, ipcGetData } from "./IPC";

// Glyph properties
let _glyphWidth = 7.81;
calculateGlyphWidth(13, 'JetBrains Mono NL');

function calculateGlyphWidth(size: number, font: string) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
        ctx.font = `${size}px '${font}'`;
        const textMetrics = ctx.measureText("i");
        _glyphWidth = textMetrics.width;
    }
}
export function glyphWidth() {
    return _glyphWidth;
}

export type DialogWindow = {
    type: DialogTypes
    props: DialogProps[DialogTypes]
}

export type StoreType = {
    repo: null | {
        path: string
        status: null | RepoStatus
    }
    branches: BranchesObj
    head?: BranchObj
    remotes: IpcActionReturn[IpcAction.REMOTES]
    heads: {
        [key: string]: BranchObj[]
    }
    currentFile: null | {
        commitSHA?: string
        patch: PatchObj
    }
    locks: {
        [key in Locks]: boolean
    }
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
};

const store: StoreType = {
    repo: null,
    branches: {
        remote: [],
        local: [],
        tags: []
    },
    head: undefined,
    remotes: [],
    heads: {},
    currentFile: null,
    locks: {
        [Locks.MAIN]: false,
        [Locks.BRANCH_LIST]: false,
    },
    dialogWindow: null,
    selectedBranch: {branch: "HEAD"},
    diffPaneSrc: "",
    viewChanges: null,
    comparePatches: [],
    commitMsg: {summary: "", body: ""},
    diffOptions: {
        ignoreWhitespace: true
    }
};
export type LinkTypes = "commits" | "branches" | "files";
export const GlobalLinks: {
    [key in LinkTypes]: {
        [key: string]: Link
    }
} = {
    commits: {},
    branches: {},
    files: {}
 };
export const Store = store as Readonly<StoreType>

export const contextMenuState: {data: {[name: string]: string}} = {
    data: {}
};

type StoreKeys = keyof StoreType;

type PartialStoreListener<T extends StoreKeys> = (arg: StoreType[T]) => void;

const listeners: {
    [K in StoreKeys]: PartialStoreListener<K>[]
} = {
    repo: [],
    branches: [],
    commitMsg: [],
    comparePatches: [],
    currentFile: [],
    dialogWindow: [],
    diffPaneSrc: [],
    head: [],
    heads: [],
    locks: [],
    remotes: [],
    selectedBranch: [],
    viewChanges: [],
    diffOptions: [],
};

function subscribe<T extends StoreKeys>(key: T, cb: PartialStoreListener<T>) {
    listeners[key].push(cb as PartialStoreListener<StoreKeys>);
    return () => unsubscribe(key, cb);
}

function unsubscribe<T extends StoreKeys>(key: T, cb: PartialStoreListener<T>) {
    listeners[key].splice(listeners[key].indexOf(cb as PartialStoreListener<StoreKeys>)>>>0, 1);
}

export abstract class StoreComponent<P = unknown, S = unknown> extends Component<P, S> {
    listeners: Array<() => void> = [];

    listen<T extends StoreKeys>(key: T, cb: PartialStoreListener<T>) {
        this.listeners.push(subscribe(key, cb));
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

    listen<T extends StoreKeys>(key: T, cb: PartialStoreListener<T>) {
        this.listeners.push(subscribe(key, cb));
    }
    registerHandler<T extends IpcAction>(action: T, cb: (arg: IpcActionReturn[T]) => void) {
        this.listeners.push(registerHandler(action, cb));
    }

    componentWillUnmount() {
        this.listeners.forEach(unsubscribe => unsubscribe());
    }
}

function triggerKeyListeners(newStore: Partial<StoreType>) {
    for (const key of Object.keys(newStore) as StoreKeys[]) {
        for (const listener of listeners[key]) {
            (listener as PartialStoreListener<StoreKeys>)(newStore[key]);
        }
    }
}

export function updateStore(newStore: Partial<StoreType>) {
    triggerKeyListeners(newStore);
    Object.assign(store, newStore);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setStoreDeep(paths: Array<string | number>, data: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let obj = store as any;
    for (const path of paths.slice(0, paths.length - 1)) {
        obj = obj[path];
    }

    const key = paths[paths.length - 1];
    const newStore = { [key]: data };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    for (const listener of listeners[paths[0]]) {
        listener(newStore);
    }

    Object.assign(obj[key], newStore);
}


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
    updateStore({
        currentFile
    });
}
export function closeFile() {
    updateStore({
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

export function setLock(lock: keyof StoreType["locks"]) {
    const locks = store.locks;
    locks[lock] = true;
    setStoreDeep(["locks", lock], locks[lock]);
}
export function clearLock(lock: keyof StoreType["locks"]) {
    const locks = store.locks;
    locks[lock] = false;
    setStoreDeep(["locks", lock], locks[lock]);
}

export function createBranchFromSha(sha: string, name: string) {
    setLock(Locks.BRANCH_LIST);
    ipcSendMessage(IpcAction.CREATE_BRANCH, {
        sha,
        name,
    });
}
export function createBranchFromRef(ref: string, name: string) {
    setLock(Locks.BRANCH_LIST);
    ipcSendMessage(IpcAction.CREATE_BRANCH_FROM_REF, {
        ref,
        name,
    });
}
export function deleteBranch(name: string) {
    setLock(Locks.BRANCH_LIST);
    ipcSendMessage(IpcAction.DELETE_REF, {
        name
    });
}
export function renameLocalBranch(oldName: string, newName: string) {
    setLock(Locks.BRANCH_LIST);
    ipcSendMessage(IpcAction.RENAME_LOCAL_BRANCH, {
        ref: oldName,
        name: newName
    });
}

export function deleteRemoteBranch(name: string) {
    setLock(Locks.BRANCH_LIST);
    ipcSendMessage(IpcAction.DELETE_REMOTE_REF, name);
}

export function setUpstream(local: string, remote: string | null) {
    return ipcGetData(IpcAction.SET_UPSTREAM, {
        local,
        remote: remote || null
    });
}

export function commit(params: IpcActionParams[IpcAction.COMMIT]) {
    ipcSendMessage(IpcAction.COMMIT, params);
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

export async function openFileHistory(file: string, sha?: string) {
    ipcSendMessage(IpcAction.LOAD_FILE_COMMITS, {file, cursor: sha, startAtCursor: true});
    updateStore({
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
