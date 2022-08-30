import { h } from "preact";
import { GlobalLinks, unselectLink } from "../Components/Link";
import { BranchObj, IpcAction, IpcActionReturn, IpcActionReturnOrError, IpcResponse, Locks, RepoStatus } from "../../Common/Actions";
import { openNativeDialog, openDialog_CompareRevisions, openDialog_Settings, openDialog_ViewCommit, openDialog_createTag, openDialog_BranchFrom, openDialog_AddRemote, openDialog_RenameRef, openDialog_SetUpstream } from "./Dialogs";
import { addWindowEventListener, registerHandler, ipcSendMessage, ipcGetData } from "./IPC";
import { Store, clearLock, setLock, updateStore, StoreType, notify, openDialogWindow, closeDialogWindow, setDiffpaneSrc } from "./store";
import { Notification } from "../Components/Notification";
import { humanReadableBytes } from "../../Common/Utils";
import { RendererRequestArgs, RendererRequestData, RendererRequestEvents, RendererRequestPayload } from "../../Common/WindowEventTypes";
import { DialogTypes } from "../Components/Dialog/types";
import { NativeDialog } from "../../Common/Dialog";

window.addEventListener("focus", () => {
    if (!Store.locks[Locks.MAIN] && Store.appConfig?.ui.refreshWorkdirOnFocus) {
        refreshWorkdir();
    }
});

const dismissibleWindows: Set<() => void> = new Set();
const dismissibleWindowsStack: Array<() => void> = [];

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        const cb = dismissibleWindowsStack.pop();
        if (cb) {
            dismissibleWindows.delete(cb);
            cb();
        }
    }
});
export function dismissibleWindowClosed(dismissCallback: () => void) {
    dismissibleWindows.delete(dismissCallback);
    dismissibleWindowsStack.splice(dismissibleWindowsStack.indexOf(dismissCallback) >>> 0, 1);
}
export function showDismissibleWindow(dismissCallback: () => void) {
    if (dismissibleWindows.has(dismissCallback)) {
        dismissibleWindowsStack.splice(dismissibleWindowsStack.indexOf(dismissCallback) >>> 0, 1);
    } else {
        dismissibleWindows.add(dismissCallback);
    }
    dismissibleWindowsStack.push(dismissCallback);
}


// Glyph properties
let _glyphWidth = 7.81;
calculateGlyphWidth(13, "JetBrainsMonoNL Nerd Font Mono");

ipcGetData(IpcAction.INIT, null).then(init => {
    if (init.repo) {
        repoOpened(init.repo);
    }
});
ipcGetData(IpcAction.GET_SETTINGS, null).then(appConfig => {
    updateStore({
        appConfig,
        diffOptions: appConfig.diffOptions
    });
});

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

// FIXME: Seems like we really do need this. Race condition with focusing of window and refreshing workdir (`refreshWorkdirOnFocus`)
let refreshingWorkDir = false;
export async function refreshWorkdir() {
    if (!Store.repo || refreshingWorkDir) {
        return;
    }
    refreshingWorkDir = true;
    await ipcGetData(IpcAction.REFRESH_WORKDIR, null);
    refreshingWorkDir = false;
}

export async function discardChanges(filePath: string) {
    refreshingWorkDir = true;
    await openNativeDialog(NativeDialog.DISCARD_CHANGES, { path: filePath });
    refreshingWorkDir = false;
}
export async function discardAllChanges() {
    refreshingWorkDir = true;
    await openNativeDialog(NativeDialog.DISCARD_ALL_CHANGES, null);
    refreshingWorkDir = false;
}

function repoOpened(result: IpcActionReturn[IpcAction.OPEN_REPO]) {
    clearLock(Locks.MAIN);
    if (!result || !result.opened) {
        return updateStore({
            repo: null
        });
    }

    GlobalLinks.branches = {};

    loadBranches();
    loadRemotes();
    loadStashes();
    updateStore({
        repo: {
            path: result.path,
            status: result.status
        },
        selectedBranch: {
            branch: "HEAD"
        },
    });
    setTimeout(() => {
        refreshWorkdir();
    }, 500);
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

function loadStashes() {
    ipcSendMessage(IpcAction.LOAD_STASHES, null);
}

function openSettings() {
    openDialog_Settings();
}

export function pull(ref: string | null) {
    return ipcGetData(IpcAction.PULL, ref);
}

export async function push() {
    return ipcGetData(IpcAction.PUSH, null);
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

const branchMap: Map<string, BranchObj> = new Map();

function mapHeads(heads: StoreType["heads"], refs: BranchObj[]) {
    for (const ref of refs) {
        branchMap.set(ref.name, ref);
        if (!heads.has(ref.headSHA)) {
            heads.set(ref.headSHA, []);
        }
        heads.get(ref.headSHA)?.push(ref);
    }
}
async function loadHEAD() {
    const head = await ipcGetData(IpcAction.LOAD_HEAD, null);
    updateStore({
        head
    });
}
export async function loadUpstreams() {
    const upstreams = await ipcGetData(IpcAction.LOAD_UPSTREAMS, null);

    for (const upstream of upstreams) {
        const branch = branchMap.get(upstream.name);
        if (branch) {
            branch.remote = upstream.remote;
            branch.status = upstream.status;
        }
    }
}
function branchesLoaded(result: IpcActionReturn[IpcAction.LOAD_BRANCHES]) {
    clearLock(Locks.BRANCH_LIST);
    Store.heads.clear();
    branchMap.clear();

    mapHeads(Store.heads, result.local);
    mapHeads(Store.heads, result.remote);
    mapHeads(Store.heads, result.tags);

    updateStore({
        branches: result,
        heads: Store.heads,
    });

    loadHEAD();
}
function stashLoaded(stash: IpcActionReturn[IpcAction.LOAD_STASHES]) {
    updateStore({
        stash
    });
}
function updateCurrentBranch(head: IpcResponse<IpcAction.CHECKOUT_BRANCH>) {
    clearLock(Locks.MAIN);
    if (head && !(head instanceof Error)) {
        updateStore({
            head
        });
    }
}

function handleCompareRevisions(data: IpcResponse<IpcAction.OPEN_COMPARE_REVISIONS>) {
    if (data && !(data instanceof Error)) {
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

function handlePullHead(res: IpcActionReturn[IpcAction.PULL]) {
    if (res) {
        loadBranches();
    }
}

function handleFileCommits(data: IpcActionReturnOrError<IpcAction.LOAD_FILE_COMMITS>) {
    if (data instanceof Error) {
        return;
    }
    updateStore({
        currentFile: {
            patch: {
                status: 0,
                hunks: [],
                newFile: { path: "", size: 0, mode: 0, flags: 0 },
                oldFile: { path: "", size: 0, mode: 0, flags: 0 },
                lineStats: { total_context: 0, total_additions: 0, total_deletions: 0 },
                actualFile: { path: data.filePath, size: 0, mode: 0, flags: 0 }
            },
            commitSHA: data.cursor
        },
    });
}

addWindowEventListener("repo-opened", repoOpened);
addWindowEventListener("open-settings", openSettings);
addWindowEventListener("app-lock-ui", setLock);
addWindowEventListener("app-unlock-ui", clearLock);
addWindowEventListener("begin-compare-revisions", openDialog_CompareRevisions);
addWindowEventListener("begin-view-commit", openDialog_ViewCommit);
addWindowEventListener("notify", notify);
addWindowEventListener("unselect-link", (linkType) => unselectLink(linkType));
addWindowEventListener("set-diffpane", (sha) => setDiffpaneSrc(sha));


addWindowEventListener("dialog:branch-from", (data) => {
    openDialog_BranchFrom(data.sha, data.type);
});
addWindowEventListener("dialog:create-tag", (data) => {
    openDialog_createTag(data.sha, data.fromCommit);
});
addWindowEventListener("dialog:add-remote", () => {
    openDialog_AddRemote();
});
addWindowEventListener("dialog:rename-ref", (data) => {
    openDialog_RenameRef(data.name, data.type);
});
addWindowEventListener("dialog:set-upstream", (data) => {
    openDialog_SetUpstream(data.local, data.remote);
})

// FIXME: Should probably handle this better..
{
    let fetchNotification: null | Notification;
    addWindowEventListener("notification:fetch-status", stats => {
        if (!fetchNotification) {
            fetchNotification = notify({title: "Fetching", time: 0});
        }
        if ("done" in stats) {
            if (stats.done) {
                fetchNotification.update({title: "Fetched", body: <p>{stats.update ? "Done" : "No update"}</p>, time: 3000});
                fetchNotification = null;
            }
            if (stats.update) {
                loadBranches();
            }
        } else if (stats.receivedObjects == stats.totalObjects) {
            fetchNotification.update({body: <p>Resolving deltas {stats.indexedDeltas}/{stats.totalDeltas}</p>});
        } else if (stats.totalObjects > 0) {
            fetchNotification.update({body: <p>Received {stats.receivedObjects}/{stats.totalObjects} objects ({stats.indexedObjects}) in {humanReadableBytes(stats.receivedBytes)}</p>});
        }
    });
}

{
    let pushNotification: null | Notification;
    addWindowEventListener("notification:push-status", status => {
        if (!pushNotification) {
            pushNotification = notify({title: "Pushing...", time: 0});
        }
        if ("done" in status) {
            if (status.done) {
                pushNotification.update({title: "Pushed", time: 3000});
                pushNotification = null;
            }
        } else if (status.totalObjects > 0) {
            pushNotification.update({body: <p>Pushed {status.transferedObjects}/{status.totalObjects} objects in {humanReadableBytes(status.bytes)}</p>});
        }
    });
}
{
    let pullNotification: null | Notification;
    addWindowEventListener("notification:pull-status", status => {
        if (!pullNotification) {
            pullNotification = notify({title: "Pulling changes...", time: 0});
        }
        if (status) {
            if (status.success) {
                pullNotification.update({title: "Done!", time: 3000});
                pullNotification = null;
            } else {
                pullNotification.update({body: <p>Failed...</p>});
            }
        }
    });
}

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
registerHandler(IpcAction.LOAD_PATCHES_WITHOUT_HUNKS, () => clearLock(Locks.COMMIT_LIST));
registerHandler(IpcAction.LOAD_STASHES, stashLoaded);
registerHandler(IpcAction.LOAD_FILE_COMMITS, handleFileCommits);


const rendererActions: {
    [E in RendererRequestEvents]: (data: RendererRequestArgs[E]) => Promise<RendererRequestData[E]>
} = {
    [RendererRequestEvents.CLONE_DIALOG]: () => new Promise((resolve, reject) => {
        openDialogWindow(DialogTypes.CLONE_REPOSITORY, {
            confirmCb(data) {
                closeDialogWindow();
                resolve(data);
            },
            cancelCb() {
                closeDialogWindow();
                reject();
            }
        })
    }),
    [RendererRequestEvents.INIT_DIALOG]: () => new Promise((resolve, reject) => {
        openDialogWindow(DialogTypes.INIT_REPOSITORY, {
            confirmCb(data) {
                closeDialogWindow();
                resolve({source: data});
            },
            cancelCb() {
                closeDialogWindow();
                reject();
            }
        })
    })
};

async function handleRequestClientData<E extends RendererRequestEvents>(payload: RendererRequestPayload<E>) {
    return rendererActions[payload.event](payload.data);
}
window.electronAPI.requestClientData(handleRequestClientData);
