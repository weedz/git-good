import { h } from "preact";
import { GlobalLinks, unselectLink } from "../Components/Link";
import { BranchObj, IpcAction, IpcActionReturn, IpcActionReturnOrError, IpcResponse, Locks } from "../../Common/Actions";
import { openNativeDialog, openDialog_CompareRevisions, openDialog_Settings, openDialog_ViewCommit, openDialog_createTag, openDialog_BranchFrom, openDialog_AddRemote, openDialog_RenameRef, openDialog_SetUpstream, openDialog_EditRemote, openDialog_PushTag } from "./Dialogs";
import { registerAppEventHandlers, registerHandler, ipcGetData } from "./IPC";
import { Store, clearLock, setLock, updateStore, StoreType, notify, openDialogWindow, closeDialogWindow, setDiffpaneSrc } from "./store";
import { Notification } from "../Components/Notification";
import { humanReadableBytes } from "../../Common/Utils";
import { AppEventData, AppEventType, RendererRequestArgs, RendererRequestData, RendererRequestEvents, RendererRequestPayload } from "../../Common/WindowEventTypes";
import { DialogTypes } from "../Components/Dialog/types";
import { NativeDialog } from "../../Common/Dialog";

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

ipcGetData(IpcAction.INIT, null);
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

export async function discardChanges(filePath: string) {
    await openNativeDialog(NativeDialog.DISCARD_CHANGES, { path: filePath });
}
export async function discardAllChanges() {
    await openNativeDialog(NativeDialog.DISCARD_ALL_CHANGES, null);
}

function repoOpened(result: AppEventData[AppEventType.REPO_OPENED]) {
    clearLock(Locks.MAIN);
    clearLock(Locks.BRANCH_LIST);
    clearLock(Locks.COMMIT_LIST);

    GlobalLinks.branches = {};
    GlobalLinks.commits = {};
    GlobalLinks.files = {};

    updateStore({
        diffPaneSrc: null,
        currentFile: null,
        branches: undefined,
        repo: {
            path: result.path,
        },
        repoStatus: result.status,
        selectedBranch: {
            branch: "HEAD"
        },
    });
}

function updateRepoStatus(result: AppEventData[AppEventType.REFRESH_WORKDIR]) {
    updateStore({
        repoStatus: result.status,
        workDir: {
            staged: result.staged,
            unstaged: result.unstaged
        },
    });
}

function openSettings() {
    openDialog_Settings();
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

function handleRemotes(remotes: IpcActionReturn[IpcAction.REMOTES]) {
    updateStore({
        remotes
    });
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


// FIXME: Should probably handle this better..
let fetchNotification: null | Notification;
function handleNotificationFetch(status: AppEventData[AppEventType.NOTIFY_FETCH_STATUS]) {
    if (!fetchNotification) {
        fetchNotification = notify({title: "Fetching", time: 0});
    }
    if ("done" in status) {
        if (status.done) {
            fetchNotification.update({title: "Fetched", body: <p>{status.update ? "Done" : "No update"}</p>, time: 3000});
            fetchNotification = null;
        }
    } else if (status.receivedObjects == status.totalObjects) {
        fetchNotification.update({body: <p>Resolving deltas {status.indexedDeltas}/{status.totalDeltas}</p>});
    } else if (status.totalObjects > 0) {
        fetchNotification.update({body: <p>Received {status.receivedObjects}/{status.totalObjects} objects ({status.indexedObjects}) in {humanReadableBytes(status.receivedBytes)}</p>});
    }
}
let pushNotification: null | Notification;
function handleNotificationPush(status: AppEventData[AppEventType.NOTIFY_PUSH_STATUS]) {
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
}

registerAppEventHandlers({
    [AppEventType.REPO_OPENED]: repoOpened,
    [AppEventType.OPEN_SETTINGS]: openSettings,
    [AppEventType.LOCK_UI]: setLock,
    [AppEventType.UNLOCK_UI]: clearLock,
    [AppEventType.BEGIN_COMPARE_REVISIONS]: openDialog_CompareRevisions,
    [AppEventType.BEGIN_VIEW_COMMIT]: openDialog_ViewCommit,
    [AppEventType.UNSELECT_LINK]: (linkType) => unselectLink(linkType),
    [AppEventType.SET_DIFFPANE]: (sha) => setDiffpaneSrc(sha),
    [AppEventType.NOTIFY]: notify,
    [AppEventType.NOTIFY_FETCH_STATUS]: handleNotificationFetch,
    [AppEventType.NOTIFY_PUSH_STATUS]: handleNotificationPush,
    [AppEventType.DIALOG_ADD_REMOTE]: openDialog_AddRemote,
    [AppEventType.DIALOG_BRANCH_FROM]: (data) => {
        openDialog_BranchFrom(data.sha, data.type);
    },
    [AppEventType.DIALOG_CREATE_TAG]: (data) => {
        openDialog_createTag(data.sha, data.fromCommit);
    },
    [AppEventType.DIALOG_EDIT_REMOTE]: openDialog_EditRemote,
    [AppEventType.DIALOG_PUSH_TAG]: openDialog_PushTag,
    [AppEventType.DIALOG_RENAME_REF]: (data) => {
        openDialog_RenameRef(data.name, data.type);
    },
    [AppEventType.DIALOG_SET_UPSTREAM]: (data) => {
        openDialog_SetUpstream(data.local, data.remote);
    },
    [AppEventType.REFRESH_WORKDIR]: updateRepoStatus,
});


registerHandler(IpcAction.LOAD_BRANCHES, branchesLoaded);
registerHandler(IpcAction.CHECKOUT_BRANCH, updateCurrentBranch);
registerHandler(IpcAction.LOAD_HUNKS, loadHunks);
registerHandler(IpcAction.OPEN_COMPARE_REVISIONS, handleCompareRevisions);
registerHandler(IpcAction.REMOTES, handleRemotes);
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
