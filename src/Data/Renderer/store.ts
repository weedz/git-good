import { IpcAction, BranchesObj, BranchObj, IpcActionReturn, PatchObj, IpcActionReturnError } from "../Actions";
import { registerHandler, sendAsyncMessage, attach } from ".";
import { ipcRenderer } from "electron";

export type StoreType = {
    repo: false | string
    branches: null | BranchesObj
    heads: {
        [key: string]: BranchObj[]
    }
    currentFile: null | {
        patch: PatchObj
    }
};

const store: StoreType = {
    repo: false,
    branches: null,
    heads: {},
    currentFile: null,
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
};

export function subscribe<T extends keyof StoreType>(cb: (arg: StoreType[T]) => void, key: T): void;
export function subscribe(cb: (arg: StoreType) => void): void;
export function subscribe(cb: (arg?: any) => void, key?: keyof StoreType) {
    if (key) {
        keyListeners[key].push(cb);
    } else {
        listeners.push(cb);
    }
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
    sendAsyncMessage(IpcAction.OPEN_REPO, repoPath);
}
export function loadBranches() {
    console.log("fetched");
    sendAsyncMessage(IpcAction.LOAD_BRANCHES);
}

export function checkoutBranch(branch: string) {
    sendAsyncMessage(IpcAction.CHECKOUT_BRANCH, branch);
}

export function openFile(sha: string, patch: PatchObj) {
    setState({
        currentFile: {
            patch
        }
    });
    sendAsyncMessage(IpcAction.LOAD_HUNKS, {
        sha: sha,
        path: patch.actualFile.path
    });
}
export function closeFile() {
    setState({
        currentFile: null
    });
}

function loadHunks(data: IpcActionReturn[IpcAction.LOAD_HUNKS]) {
    if (store.currentFile && data.hunks) {
        store.currentFile.patch.hunks = data.hunks;
        setState({
            currentFile: store.currentFile
        });
    }
}

function repoOpened(result: IpcActionReturn[IpcAction.OPEN_REPO] | IpcActionReturnError) {
    if ("error" in result) {
        console.warn(result);
    } else if (result.opened) {
        localStorage.setItem("recent-repo", result.path);
        setState({
            repo: result.path
        });
    } else {
        setState({
            repo: false
        });
    }
}
function mapHeads(heads: any, refs: BranchObj[]) {
    for (const ref of refs) {
        if (!heads[ref.headSHA]) {
            heads[ref.headSHA] = [];
        }
        heads[ref.headSHA].push(ref);
    }
}
function branchesLoaded(branches: BranchesObj) {
    console.log("loaded branches");
    const heads:any = {};
    mapHeads(heads, branches.local);
    mapHeads(heads, branches.remote);
    mapHeads(heads, branches.tags);
    setState({
        branches,
        heads
    });
}
function updateCurrentBranch(result: IpcActionReturn[IpcAction.CHECKOUT_BRANCH]) {
    if (result && store.branches) {
        store.branches.head = result;
        setState({
            branches: store.branches
        });
    }
}

attach();
ipcRenderer.on('repo-opened', (_, opened) => repoOpened(opened));
ipcRenderer.on('repo-fetch-all', (_) => loadBranches());
registerHandler(IpcAction.OPEN_REPO, repoOpened);
registerHandler(IpcAction.LOAD_BRANCHES, branchesLoaded);
registerHandler(IpcAction.CHECKOUT_BRANCH, updateCurrentBranch);
registerHandler(IpcAction.LOAD_HUNKS, loadHunks);
