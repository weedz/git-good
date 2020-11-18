import { DialogProps, DialogTypes } from "src/Components/Dialog/types";
import Link, { unselectLink } from "src/Components/Link";
import { IpcAction, BranchesObj, BranchObj, PatchObj, Locks, RepoStatus, IpcActionParams } from "../Actions";
import { sendAsyncMessage } from "./IPC";

export type DialogWindow = {
    type: DialogTypes
    props: DialogProps[DialogTypes]
}

export type StoreType = {
    repo: null | {
        path: string
        status: null | RepoStatus
    }
    branches: null | BranchesObj
    remotes: string[]
    heads: {
        [key: string]: BranchObj[]
    }
    currentFile: null | {
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
};

const store: StoreType = {
    repo: null,
    branches: null,
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

type KeyListeners = "repo" | "branches" | "heads" | "currentFile" | "locks" | "dialogWindow" | "selectedBranch" | "diffPaneSrc" | "viewChanges" | "comparePatches" | "commitMsg";

type StoreListener = (arg: Partial<StoreType>) => void;
type PartialStoreListener<T extends KeyListeners> = (arg: StoreType[T]) => void;

const listeners: StoreListener[] = [];
const keyListeners: {
    [key in KeyListeners]: PartialStoreListener<KeyListeners>[]
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
    commitMsg: [],
};

export function subscribe<T extends KeyListeners>(cb: PartialStoreListener<T>, key: T): () => void;
// eslint-disable-next-line no-redeclare
export function subscribe(cb: StoreListener): () => void;
// eslint-disable-next-line no-redeclare, @typescript-eslint/no-explicit-any
export function subscribe(cb: (arg: any) => void, key?: KeyListeners) {
    if (key) {
        keyListeners[key].push(cb);
    } else {
        listeners.push(cb);
    }
    return () => unsubscribe(cb, key);
}

export function unsubscribe<T extends KeyListeners>(cb: PartialStoreListener<T>, key?: T): void;
// eslint-disable-next-line no-redeclare, ,@typescript-eslint/no-explicit-any
export function unsubscribe(cb: (arg?: any) => void, key?: KeyListeners): void {
    if (key) {
        // x>>>0 casts x to a 32-bit unsigned int, -1 becomes 4294967295
        keyListeners[key].splice(keyListeners[key].indexOf(cb)>>>0, 1);
    } else {
        listeners.splice(listeners.indexOf(cb)>>>0, 1);
    }
}

function triggerKeyListeners(newState: Pick<StoreType, KeyListeners>) {
    for (const key in newState) {
        if (key in keyListeners) {
            for (const listener of keyListeners[key as KeyListeners]) {
                listener(newState[key as KeyListeners]);
            }
        }
    }
}

export function setState(newState: Partial<StoreType>) {
    Object.assign(store, newState);
    for (const listener of listeners) {
        listener(newState);
    }
    triggerKeyListeners(newState as Pick<StoreType, KeyListeners>);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setStateDeep(paths: any[], data: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let obj = store as any;
    for (const path of paths.slice(0, paths.length - 1)) {
        obj = obj[path];
    }

    const key = paths[paths.length - 1];
    const newState = { [key]: data };

    Object.assign(obj[key], newState);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    for (const listener of keyListeners[paths[0]]) {
        listener(newState);
    }
}

export function openRepo(repoPath: IpcActionParams[IpcAction.OPEN_REPO]) {
    setLock(Locks.MAIN);
    sendAsyncMessage(IpcAction.OPEN_REPO, repoPath);
}

export function resolveConflict(path: string) {
    sendAsyncMessage(IpcAction.RESOLVE_CONFLICT, {path});
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
    unselectLink("files");
}
export function abortRebase() {
    sendAsyncMessage(IpcAction.ABORT_REBASE);
}
export function continueRebase() {
    sendAsyncMessage(IpcAction.CONTINUE_REBASE);
}

export function setLock(lock: keyof StoreType["locks"]) {
    const locks = store.locks;
    locks[lock] = true;
    setStateDeep(["locks", lock], locks[lock]);
}
export function clearLock(lock: keyof StoreType["locks"]) {
    const locks = store.locks;
    locks[lock] = false;
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

export function openDialogWindow<T extends DialogTypes>(type: T, props: DialogProps[T]) {
    setState({
        dialogWindow: {
            type,
            props
        }
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
