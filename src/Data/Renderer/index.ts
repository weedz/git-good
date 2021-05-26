import { Diff } from "nodegit";
import { dialog } from "@electron/remote";
import { unselectLink } from "src/Components/Link";
import { BranchObj, IpcAction, IpcActionReturn, IpcResponse, Locks, RepoStatus } from "../Actions";
import { openDialog_CompareRevisions, openDialog_Settings } from "./Dialogs";
import { addWindowEventListener, registerHandler, ipcSendMessage, ipcGetData } from "./IPC";
import { Store, clearLock, setLock, updateStore, StoreType, GlobalLinks } from "./store";

let refreshingWorkdir = false;

window.addEventListener("focus", async () => {
    refreshWorkdir()
});

export async function refreshWorkdir() {
    if (refreshingWorkdir) {
        return;
    }
    refreshingWorkdir = true;
    let options = null;
    if (Store.diffOptions.ignoreWhitespace) {
        options = {
            flags: Diff.OPTION.IGNORE_WHITESPACE
        };
    }
    await ipcGetData(IpcAction.REFRESH_WORKDIR, options);
    refreshingWorkdir = false;
}

export async function discardChanges(filePath: string) {
    refreshingWorkdir = true;
    const result = await dialog.showMessageBox({
        message: `Discard changes to "${filePath}"?`,
        type: "question",
        buttons: ["Cancel", "Discard changes"],
        cancelId: 0,
    });
    // Need this timeout so the window focus event is fired before IpcAction.DISCARD_FILE
    setTimeout(async () => {
        refreshingWorkdir = false;
        if (result.response === 1) {
            await ipcGetData(IpcAction.DISCARD_FILE, filePath);
            refreshWorkdir();
        }
    }, 200);
}

function repoOpened(result: IpcActionReturn[IpcAction.OPEN_REPO]) {
    // FIXME: error handler??
    clearLock(Locks.MAIN);
    if (result.opened) {
        localStorage.setItem("recent-repo", result.path);
        loadBranches();
        refreshWorkdir();
        loadRemotes();
        updateStore({
            repo: {
                path: result.path,
                status: result.status
            },
            selectedBranch: {
                branch: "HEAD"
            },
        });
    } else {
        updateStore({
            repo: null
        });
    }
}

function updateRepoStatus(result: {status: RepoStatus})
{
    if (Store.repo) {
        updateStore({
            repo: {
                ...Store.repo,
                status: result.status,
            },
        });
    }
}

function loadBranches() {
    setLock(Locks.BRANCH_LIST);
    ipcSendMessage(IpcAction.LOAD_BRANCHES, null);
}

function loadRemotes() {
    ipcSendMessage(IpcAction.REMOTES, null);
}

function openSettings() {
    openDialog_Settings();
}

export function pull(ref: string | null) {
    ipcSendMessage(IpcAction.PULL, ref);
}

export function push() {
    ipcSendMessage(IpcAction.PUSH, null);
}

function setStatus(status: RepoStatus) {
    const repo = Store.repo;
    if (repo) {
        repo.status = status;
        updateStore({
            repo
        });
    }
}

function loadHunks(data: IpcActionReturn[IpcAction.LOAD_HUNKS]) {
    if (Store.currentFile && data.hunks) {
        const currentFile = Store.currentFile;
        currentFile.patch.hunks = data.hunks;
        updateStore({
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
function branchesLoaded(result: IpcActionReturn[IpcAction.LOAD_BRANCHES]) {
    clearLock(Locks.BRANCH_LIST);
    const heads: StoreType["heads"] = {};

    GlobalLinks.branches = {};

    mapHeads(heads, result.local);
    mapHeads(heads, result.remote);
    mapHeads(heads, result.tags);
    updateStore({
        branches: result,
        head: result.head,
        heads
    });
}
function updateCurrentBranch(result: IpcResponse<IpcAction.CHECKOUT_BRANCH>) {
    clearLock(Locks.MAIN);
    if (result) {
        updateStore({
            head: result
        });
    }
}

function handleCompareRevisions(data: IpcResponse<IpcAction.OPEN_COMPARE_REVISIONS>) {
    if (data) {
        unselectLink("commits");
        updateStore({
            comparePatches: data,
        });
    }
}

function handleNewCommit() {
    refreshWorkdir();
    loadBranches();
}

function handleRemotes(remotes: IpcActionReturn[IpcAction.REMOTES]) {
    updateStore({
        remotes
    });
}

function handlePullHead(_res: IpcActionReturn[IpcAction.PULL]) {
    loadBranches();
}

addWindowEventListener("repo-opened", repoOpened);
addWindowEventListener("refresh-workdir", refreshWorkdir);
addWindowEventListener("open-settings", openSettings);
addWindowEventListener("app-lock-ui", setLock);
addWindowEventListener("app-unlock-ui", clearLock);
addWindowEventListener("begin-compare-revisions", openDialog_CompareRevisions);
addWindowEventListener("fetch-status", stats => {
    if ("done" in stats) {
        console.log(`Fetch all done: ${stats.update ? "refreshing branch/commit list": "no update"}`);
        if (stats.update) {
            loadBranches();
        }
    } else if (stats.receivedObjects == stats.totalObjects) {
        console.log(`Resolving deltas ${stats.indexedDeltas}/${stats.totalDeltas}`);
    } else if (stats.totalObjects > 0) {
        console.log(`Received ${stats.receivedObjects}/${stats.totalObjects} objects (${stats.indexedObjects}) in ${stats.receivedBytes} bytes`);
    }
});

registerHandler(IpcAction.OPEN_REPO, repoOpened);
registerHandler(IpcAction.REFRESH_WORKDIR, updateRepoStatus);
registerHandler(IpcAction.LOAD_BRANCHES, branchesLoaded);
registerHandler(IpcAction.CHECKOUT_BRANCH, updateCurrentBranch);
registerHandler(IpcAction.LOAD_HUNKS, loadHunks);
registerHandler(IpcAction.PULL, handlePullHead);
registerHandler(IpcAction.PUSH, loadBranches);
registerHandler(IpcAction.SET_UPSTREAM, loadBranches);
registerHandler(IpcAction.CREATE_BRANCH, loadBranches);
registerHandler(IpcAction.CREATE_BRANCH_FROM_REF, loadBranches);
registerHandler(IpcAction.DELETE_REF, loadBranches);
registerHandler(IpcAction.DELETE_REMOTE_REF, loadBranches);
registerHandler(IpcAction.RENAME_LOCAL_BRANCH, loadBranches);
registerHandler(IpcAction.ABORT_REBASE, setStatus);
registerHandler(IpcAction.CONTINUE_REBASE, setStatus);
registerHandler(IpcAction.OPEN_COMPARE_REVISIONS, handleCompareRevisions);
registerHandler(IpcAction.COMMIT, handleNewCommit);
registerHandler(IpcAction.REMOTES, handleRemotes);
registerHandler(IpcAction.CREATE_TAG, loadBranches);
registerHandler(IpcAction.DELETE_TAG, loadBranches);

registerHandler(IpcAction.LOAD_COMMIT, () => setLock(Locks.COMMIT_LIST));
registerHandler(IpcAction.LOAD_PATCHES_WITHOUT_HUNKS, () => clearLock(Locks.COMMIT_LIST));
