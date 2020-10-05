import { IpcAction, BranchesObj, BranchObj, PatchObj, Locks, RepoStatus } from "../Actions";
import { sendAsyncMessage } from "./IPC";

export type DialogWindow = {
    title: string
    confirmCb: Function
    cancelCb: Function
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
    comparePatches: PatchObj[],
};

const store: StoreType = {
    repo: null,
    branches: null,
    heads: {},
    currentFile: null,
    locks: {
        [Locks.MAIN]: 0,
    },
    dialogWindow: null,
    selectedBranch: {},
    diffPaneSrc: "",
    viewChanges: null,
    comparePatches: [],
};

export const Store = store as Readonly<StoreType>

export const contextMenuState: {data: any} = {
    data: null
};

const listeners: Function[] = [];
const keyListeners: {
    [key in keyof StoreType]: Function[]
} = {
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
};

export function subscribe<T extends keyof StoreType>(cb: (arg: StoreType[T]) => void, key: T): typeof unsubscribe;
export function subscribe(cb: (arg: StoreType) => void): typeof unsubscribe;
export function subscribe(cb: (arg?: any) => void, key?: keyof StoreType) {
    if (key) {
        keyListeners[key].push(cb);
    } else {
        listeners.push(cb);
    }
    return () => unsubscribe(cb, key);
}

export function unsubscribe(cb: Function, key?: keyof StoreType) {
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
    for (const key of Object.keys(newState) as Array<keyof StoreType>) {
        for (const listener of keyListeners[key]) {
            listener(newState[key]);
        }
    }
}

export function openRepo(repoPath: string) {
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
    setState({
        locks,
    });
}
export function clearLock(lock: keyof StoreType["locks"]) {
    const locks = store.locks;
    if (locks[lock] > 0) {
        locks[lock]--;
    }
    setState({
        locks,
    });
}

export function createBranch(fromSha: string, name: string) {
    sendAsyncMessage(IpcAction.CREATE_BRANCH, {
        sha: fromSha,
        name,
    });
}
export function createBranchFromRef(ref: string, name: string) {
    sendAsyncMessage(IpcAction.CREATE_BRANCH_FROM_REF, {
        ref,
        name,
    });
}
export function deleteBranch(name: string) {
    sendAsyncMessage(IpcAction.DELETE_REF, {
        name
    });
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
