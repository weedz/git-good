import { IPCAction, BranchesObj, BranchObj, IPCActionReturn, PatchObj } from "../Actions";
import { registerHandler, sendAsyncMessage, attach } from ".";

export type StoreType = {
    repo: boolean
    branches: null | BranchesObj
    heads: {
        [key: string]: BranchObj[]
    }
    currentFile: null | {
        patch: PatchObj
    }
};

export const Store: StoreType = {
    repo: false,
    branches: null,
    heads: {},
    currentFile: null,
};

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

export function subscribe(cb: Function, key?: keyof StoreType) {
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
    Object.assign(Store, newState);
    for (const listener of listeners) {
        listener(newState);
    }
    for (const key of Object.keys(newState) as Array<keyof StoreType>) {
        for (const listener of keyListeners[key]) {
            listener(newState[key]);
        }
    }
}

export function openRepo(path: string) {
    setState({
        repo: false
    })
    sendAsyncMessage(IPCAction.OPEN_REPO, path);
}
export function loadBranches() {
    sendAsyncMessage(IPCAction.LOAD_BRANCHES);
}

export function checkoutBranch(branch: string) {
    sendAsyncMessage(IPCAction.CHECKOUT_BRANCH, branch);
}

export function openFile(sha: string, patch: PatchObj) {
    setState({
        currentFile: {
            patch
        }
    });
    sendAsyncMessage(IPCAction.LOAD_HUNKS, {
        sha: sha,
        path: patch.actualFile.path
    });
}
export function closeFile() {
    setState({
        currentFile: null
    });
}

function loadHunks(data: IPCActionReturn[IPCAction.LOAD_HUNKS]) {
    if (Store.currentFile && data.hunks) {
        Store.currentFile.patch.hunks = data.hunks;
        setState({
            currentFile: Store.currentFile
        });
    }
}

function repoOpened(opened: IPCActionReturn[IPCAction.OPEN_REPO]) {
    setState({
        repo: opened
    });
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
    const heads:any = {};
    mapHeads(heads, branches.local);
    mapHeads(heads, branches.remote);
    mapHeads(heads, branches.tags);
    setState({
        branches,
        heads
    });
}
function updateCurrentBranch(result: IPCActionReturn[IPCAction.CHECKOUT_BRANCH]) {
    if (result && Store.branches) {
        Store.branches.head = result;
        setState({
            branches: Store.branches
        });
    }
}

attach();
registerHandler(IPCAction.OPEN_REPO, repoOpened);
registerHandler(IPCAction.LOAD_BRANCHES, branchesLoaded);
registerHandler(IPCAction.CHECKOUT_BRANCH, updateCurrentBranch);
registerHandler(IPCAction.LOAD_HUNKS, loadHunks);
