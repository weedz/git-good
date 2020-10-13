import { IpcAction, BranchesObj, BranchObj, PatchObj, Locks, RepoStatus, IpcActionParams } from "../Actions";
import { sendAsyncMessage } from "./IPC";

export type DialogWindow = {
    title: string
    confirmCb: Function
    cancelCb: Function
    defaultValue?: string
}

export type StoreType = {
    repo: null | {
        path: string
        status: null | RepoStatus
    }
    branches: null | BranchesObj
    heads: {
        [key: string]: BranchObj[]
    }
    currentFile: null | {
        patch: PatchObj
    }
    locks: {
        [key in Locks]: number
    }
    dialogWindow: null | DialogWindow
    selectedBranch: {branch?: string, history?: boolean}
    diffPaneSrc: string
    viewChanges: null
    comparePatches: PatchObj[]
    commitMsg: {
        summary: string
        body: string
    }
};

const store: StoreType = {
    repo: null,
    branches: null,
    heads: {},
    currentFile: null,
    locks: {
        [Locks.MAIN]: 0,
        [Locks.BRANCH_LIST]: 0,
    },
    dialogWindow: null,
    selectedBranch: {branch: "HEAD"},
    diffPaneSrc: "",
    viewChanges: null,
    comparePatches: [],
    commitMsg: {summary: "", body: ""},
};

export const Store = store as Readonly<StoreType>

export const contextMenuState: {data: any} = {
    data: null
};

type KeyListeners = "repo" | "branches" | "heads" | "currentFile" | "locks" | "dialogWindow" | "selectedBranch" | "diffPaneSrc" | "viewChanges" | "comparePatches" | "commitMsg";

const listeners: Function[] = [];
const keyListeners: Pick<{
    [key in keyof StoreType]: Function[]
}, KeyListeners> = {
    repo: [],
    branches: [],
    heads: [],
    currentFile: [],
    locks: [],
    dialogWindow: [],
    selectedBranch: [],
    diffPaneSrc: [],
    viewChanges: [],
    comparePatches: [],
    commitMsg: [],
};

export function subscribe<T extends KeyListeners>(cb: (arg: StoreType[T]) => void, key: T): typeof unsubscribe;
export function subscribe(cb: (arg: StoreType) => void): typeof unsubscribe;
export function subscribe(cb: (arg?: any) => void, key?: KeyListeners) {
    if (key) {
        keyListeners[key].push(cb);
    } else {
        listeners.push(cb);
    }
    return () => unsubscribe(cb, key);
}

export function unsubscribe(cb: Function, key?: KeyListeners) {
    if (key) {
        // x>>>0 casts x to a 32-bit unsigned int, -1 becomes 4294967295
        keyListeners[key].splice(keyListeners[key].indexOf(cb)>>>0, 1);
    } else {
        listeners.splice(listeners.indexOf(cb)>>>0, 1);
    }
}

export function setState(newState: Partial<StoreType>) {
    Object.assign(store, newState);
    for (const listener of listeners) {
        listener(newState);
    }
    for (const key of Object.keys(newState).filter(key => key in keyListeners) as Array<KeyListeners>) {
        for (const listener of keyListeners[key]) {
            listener(newState[key]);
        }
    }
}

function setStateDeep(paths: any[], data: any) {
    let obj = store as any;
    for (const path of paths.slice(0, paths.length - 1)) {
        obj = obj[path];
    }

    const key = paths[paths.length - 1];
    const newState = { [key]: data };

    Object.assign(obj[key], newState);
    // @ts-ignore
    for (const listener of keyListeners[paths[0]]) {
        listener(newState);
    }
}

export function openRepo(repoPath: IpcActionParams[IpcAction.OPEN_REPO]) {
    setLock(Locks.MAIN);
    sendAsyncMessage(IpcAction.OPEN_REPO, repoPath);
}

export function checkoutBranch(branch: string) {
    setLock(Locks.MAIN);
    sendAsyncMessage(IpcAction.CHECKOUT_BRANCH, branch);
}

export function openFile(params: ({sha: string} | {workDir: true} | {compare: true}) & {patch: PatchObj}) {
    setState({
        currentFile: {
            patch: params.patch
        }
    });
    if (!params.patch.hunks) {
        if ("sha" in params) {
            sendAsyncMessage(IpcAction.LOAD_HUNKS, {
                sha: params.sha,
                path: params.patch.actualFile.path,
            });
        } else if ("compare" in params) {
            sendAsyncMessage(IpcAction.LOAD_HUNKS, {
                compare: true,
                path: params.patch.actualFile.path,
            });
        } else {
            sendAsyncMessage(IpcAction.LOAD_HUNKS, {
                workDir: true,
                path: params.patch.actualFile.path,
            });
        }
    }
}
export function closeFile() {
    setState({
        currentFile: null
    });
}
export function abortRebase() {
    sendAsyncMessage(IpcAction.ABORT_REBASE);
}
export function continueRebase() {
    sendAsyncMessage(IpcAction.CONTINUE_REBASE);
}

export function setLock(lock: keyof StoreType["locks"], event?:any) {
    const locks = store.locks;
    locks[lock]++;
    setStateDeep(["locks", lock], locks[lock]);
}
export function clearLock(lock: keyof StoreType["locks"]) {
    const locks = store.locks;
    if (locks[lock] > 0) {
        locks[lock]--;
    }
    setStateDeep(["locks", lock], locks[lock]);
}

export function createBranchFromSha(sha: string, name: string) {
    setLock(Locks.BRANCH_LIST);
    sendAsyncMessage(IpcAction.CREATE_BRANCH, {
        sha,
        name,
    });
}
export function createBranchFromRef(ref: string, name: string) {
    setLock(Locks.BRANCH_LIST);
    sendAsyncMessage(IpcAction.CREATE_BRANCH_FROM_REF, {
        ref,
        name,
    });
}
export function deleteBranch(name: string) {
    setLock(Locks.BRANCH_LIST);
    sendAsyncMessage(IpcAction.DELETE_REF, {
        name
    });
}

export function deleteRemoteBranch(name: string) {
    setLock(Locks.BRANCH_LIST);
    sendAsyncMessage(IpcAction.DELETE_REMOTE_REF, name);
}

export function push(remote: string, localBranch: string, remoteBranch?: string, force?: boolean) {
    setLock(Locks.BRANCH_LIST);
    sendAsyncMessage(IpcAction.PUSH, {
        localBranch,
        remoteBranch,
        remote,
        force
    });
}

export function setUpstream(local: string, remote: string) {
    sendAsyncMessage(IpcAction.SET_UPSTREAM, {
        local,
        remote: remote || null
    });
}

export function commit(params: IpcActionParams[IpcAction.COMMIT]) {
    sendAsyncMessage(IpcAction.COMMIT, params);
}

export function openDialogWindow(dialogWindow: StoreType["dialogWindow"]) {
    setState({
        dialogWindow
    });
}
export function closeDialogWindow() {
    setState({
        dialogWindow: null
    });
}

export function blameFile(file: string) {
    sendAsyncMessage(IpcAction.BLAME_FILE, file);
}
