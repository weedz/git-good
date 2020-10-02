import { IpcAction, BranchesObj, BranchObj, IpcActionReturn, PatchObj, IpcActionReturnError, Locks, RepoStatus } from "../Actions";
import { registerHandler, sendAsyncMessage, attach } from ".";
import { ipcRenderer } from "electron";
import { WindowEvents, WindowArguments } from "../WindowEventTypes";

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
export function loadBranches() {
    console.log("fetched");
    setLock(Locks.MAIN);
    sendAsyncMessage(IpcAction.LOAD_BRANCHES);
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

function setStatus(status: RepoStatus) {
    const repo = store.repo;
    if (repo) {
        repo.status = status;
        setState({
            repo
        });
    }
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
    clearLock(Locks.MAIN);
    if ("error" in result) {
        console.warn(result);
    } else if (result.opened) {
        localStorage.setItem("recent-repo", result.path);
        setState({
            repo: {
                path: result.path,
                status: result.status
            }
        });
        loadBranches();
        refreshWorkdir();
    } else {
        setState({
            repo: null
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
    clearLock(Locks.MAIN);
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
    clearLock(Locks.MAIN);
    if (result && store.branches) {
        store.branches.head = result;
        setState({
            branches: store.branches
        });
    }
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
export function refreshWorkdir() {
    sendAsyncMessage(IpcAction.REFRESH_WORKDIR);
}
export function openSettings() {
    console.log("open settings");
}
export function pullHead() {
    setLock(Locks.MAIN);
    sendAsyncMessage(IpcAction.PULL);
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

function openDialogCompareRevisions() {
    openDialogWindow({
        title: "Compare revisions:",
        confirmCb: (data: any) => {
            if (data.branchName)
            {
                const [from,to] = data.branchName.split("..");
                if (from && to) {
                    sendAsyncMessage(IpcAction.OPEN_COMPARE_REVISIONS, {
                        from,
                        to
                    });
                }
            }
            closeDialogWindow();
        },
        cancelCb: () => {
            closeDialogWindow();
        }
    });
}
function handleCompareRevisions(data: any) {
    if ("error" in data) {
        console.warn(data.error);
    } else {
        setState({
            comparePatches: data,
            selectedBranch: undefined,
        });
    }
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

function addWindowEventListener<T extends WindowEvents>(event: T, cb: (args: WindowArguments[T]) => void) {
    // @ts-ignore
    ipcRenderer.on(event, (_, args) => cb(args, event));
}

attach();
addWindowEventListener("repo-opened", repoOpened);
addWindowEventListener("repo-fetch-all", loadBranches);
addWindowEventListener("refresh-workdir", refreshWorkdir);
addWindowEventListener("open-settings", openSettings);
addWindowEventListener("app-lock-ui", setLock);
addWindowEventListener("app-unlock-ui", clearLock);
addWindowEventListener("pull-head", pullHead);
addWindowEventListener("begin-compare-revisions", openDialogCompareRevisions);
addWindowEventListener("fetch-status", (stats: WindowArguments["fetch-status"]) => {
    if (stats.receivedObjects == stats.totalObjects) {
        console.log(`Resolving deltas ${stats.indexedDeltas}/${stats.totalDeltas}`);
    } else if (stats.totalObjects > 0) {
        console.log(`Received ${stats.receivedObjects}/${stats.totalObjects} objects (${stats.indexedObjects}) in ${stats.receivedBytes} bytes`);
    }
});

registerHandler(IpcAction.OPEN_REPO, repoOpened);
registerHandler(IpcAction.LOAD_BRANCHES, branchesLoaded);
registerHandler(IpcAction.CHECKOUT_BRANCH, updateCurrentBranch);
registerHandler(IpcAction.LOAD_HUNKS, loadHunks);
registerHandler(IpcAction.PULL, loadBranches);
registerHandler(IpcAction.PUSH, loadBranches);
registerHandler(IpcAction.CREATE_BRANCH, loadBranches);
registerHandler(IpcAction.CREATE_BRANCH_FROM_REF, loadBranches);
registerHandler(IpcAction.DELETE_REF, loadBranches);
registerHandler(IpcAction.ABORT_REBASE, setStatus);
registerHandler(IpcAction.CONTINUE_REBASE, setStatus);
registerHandler(IpcAction.OPEN_COMPARE_REVISIONS, handleCompareRevisions);
