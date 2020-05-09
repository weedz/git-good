import { IPCAction, BranchesObj } from "../Actions";
import { registerHandler, sendAsyncMessage, attach } from ".";

export type StoreType = {
    repo: boolean
    branches: null | BranchesObj
    heads: any
}

export const Store: StoreType = {
    repo: false,
    branches: null,
    heads: {}
};

const listeners: Function[] = [];
const keyListeners: {
    [key in keyof StoreType]: Function[]
} = {
    repo: [],
    branches: [],
    heads: []
}

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

function repoOpened() {
    setState({
        repo: true
    });
}
function branchesLoaded(branches: BranchesObj) {
    // Update heads
    setState({
        branches
    });
}

attach();
registerHandler(IPCAction.OPEN_REPO, repoOpened);
registerHandler(IPCAction.LOAD_BRANCHES, branchesLoaded);
