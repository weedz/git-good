import { BranchesObj, BranchObj, IpcAction, IpcActionReturn, IpcActionReturnError, Locks, RepoStatus } from "../Actions";
import { WindowArguments } from "../WindowEventTypes";
import { openDialog_BlameFile, openDialog_CompareRevisions } from "./Dialogs";
import { addWindowEventListener, registerHandler, sendAsyncMessage } from "./IPC";
import { Store, clearLock, setLock, setState, StoreType, GlobalLinks, push } from "./store";

function refreshWorkdir() {
    sendAsyncMessage(IpcAction.REFRESH_WORKDIR);
}

function repoOpened(result: IpcActionReturn[IpcAction.OPEN_REPO] | IpcActionReturnError) {
    clearLock(Locks.MAIN);
    if ("error" in result) {
        console.warn(result);
        return;
    }
    if (result.opened) {
        localStorage.setItem("recent-repo", result.path);
        loadBranches();
        refreshWorkdir();
        loadRemotes();
        setState({
            repo: {
                path: result.path,
                status: result.status
            },
            selectedBranch: {
                branch: "HEAD"
            },
        });
    } else {
        setState({
            repo: null
        });
    }
}

function loadBranches() {
    setLock(Locks.BRANCH_LIST);
    sendAsyncMessage(IpcAction.LOAD_BRANCHES);
}

function loadRemotes() {
    sendAsyncMessage(IpcAction.REMOTES);
}

function openSettings() {
    console.log("open settings");
}

export function pullHead() {
    sendAsyncMessage(IpcAction.PULL);
}
function pushHead() {
    push("origin", "HEAD");
}

function setStatus(status: RepoStatus) {
    const repo = Store.repo;
    if (repo) {
        repo.status = status;
        setState({
            repo
        });
    }
}

function loadHunks(data: IpcActionReturn[IpcAction.LOAD_HUNKS]) {
    if (Store.currentFile && data.hunks) {
        const currentFile = Store.currentFile;
        currentFile.patch.hunks = data.hunks;
        setState({
            currentFile
        });
    }
}

function mapHeads(heads: StoreType["heads"], refs: BranchObj[]) {
    for (const ref of refs) {
        if (!heads[ref.headSHA]) {
            heads[ref.headSHA] = [];
        }
        heads[ref.headSHA].push(ref);
    }
}
function branchesLoaded(branches: BranchesObj) {
    clearLock(Locks.BRANCH_LIST);
    const heads: StoreType["heads"] = {};

    GlobalLinks.branches = {};

    mapHeads(heads, branches.local);
    mapHeads(heads, branches.remote);
    mapHeads(heads, branches.tags);
    setState({
        branches,
        heads
    });
}
function updateCurrentBranch(result: IpcActionReturn[IpcAction.CHECKOUT_BRANCH] | IpcActionReturnError) {
    clearLock(Locks.MAIN);
    if (result && !("error" in result) && Store.branches) {
        const branches = Store.branches;
        branches.head = result;
        setState({
            branches
        });
    }
}

function handleCompareRevisions(data: IpcActionReturn[IpcAction.OPEN_COMPARE_REVISIONS] | IpcActionReturnError) {
    if ("error" in data) {
        console.warn(data.error);
    } else {
        setState({
            comparePatches: data,
            // selectedBranch: undefined,
        });
    }
}

function handleBlameFile(data: IpcActionReturn[IpcAction.BLAME_FILE]) {
    console.log("blame", data);
}

function handlePushResult(res: IpcActionReturn[IpcAction.PUSH] | IpcActionReturnError) {
    if ("error" in res) {
        return;
    }
    loadBranches();
}

function handleNewCommit() {
    refreshWorkdir();
    loadBranches();
    setState({
        selectedBranch: Store.selectedBranch
    });
}

function handleRemotes(data: IpcActionReturn[IpcAction.REMOTES]) {
    setState({
        remotes: data.result
    });
}

function handlePullHead(res: IpcActionReturn[IpcAction.PULL] | IpcActionReturnError) {
    if ("error" in res) {
        return;
    }
    loadBranches();
    setState({
        selectedBranch: Store.selectedBranch
    });
}

addWindowEventListener("repo-opened", repoOpened);
addWindowEventListener("refresh-workdir", refreshWorkdir);
addWindowEventListener("open-settings", openSettings);
addWindowEventListener("app-lock-ui", setLock);
addWindowEventListener("app-unlock-ui", clearLock);
addWindowEventListener("pull-head", pullHead);
addWindowEventListener("push-head", pushHead);
addWindowEventListener("begin-compare-revisions", openDialog_CompareRevisions);
addWindowEventListener("begin-blame-file", openDialog_BlameFile);
addWindowEventListener("fetch-status", (stats: WindowArguments["fetch-status"]) => {
    if ("done" in stats) {
        console.log("Fetch all: done");
        loadBranches();
    } else if (stats.receivedObjects == stats.totalObjects) {
        console.log(`Resolving deltas ${stats.indexedDeltas}/${stats.totalDeltas}`);
    } else if (stats.totalObjects > 0) {
        console.log(`Received ${stats.receivedObjects}/${stats.totalObjects} objects (${stats.indexedObjects}) in ${stats.receivedBytes} bytes`);
    }
});

registerHandler(IpcAction.OPEN_REPO, repoOpened);
registerHandler(IpcAction.LOAD_BRANCHES, branchesLoaded);
registerHandler(IpcAction.CHECKOUT_BRANCH, updateCurrentBranch);
registerHandler(IpcAction.LOAD_HUNKS, loadHunks);
registerHandler(IpcAction.PULL, handlePullHead);
registerHandler(IpcAction.PUSH, handlePushResult);
registerHandler(IpcAction.SET_UPSTREAM, loadBranches);
registerHandler(IpcAction.CREATE_BRANCH, loadBranches);
registerHandler(IpcAction.CREATE_BRANCH_FROM_REF, loadBranches);
registerHandler(IpcAction.DELETE_REF, loadBranches);
registerHandler(IpcAction.DELETE_REMOTE_REF, loadBranches);
registerHandler(IpcAction.ABORT_REBASE, setStatus);
registerHandler(IpcAction.CONTINUE_REBASE, setStatus);
registerHandler(IpcAction.OPEN_COMPARE_REVISIONS, handleCompareRevisions);
registerHandler(IpcAction.BLAME_FILE, handleBlameFile);
registerHandler(IpcAction.COMMIT, handleNewCommit);
registerHandler(IpcAction.REMOTES, handleRemotes);
