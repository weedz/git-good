import type { BranchObj, IpcActionParams, IpcActionReturnOrError, IpcResponse, PatchObj } from "../../Common/Actions.js";
import { IpcAction, Locks } from "../../Common/Actions.js";
import { HEAD_REF } from "../../Common/Branch.js";
import { NativeDialog } from "../../Common/Dialog.js";
import { humanReadableBytes } from "../../Common/Utils.js";
import {
    type AppEventData,
    AppEventType,
    LinkTypes,
    type RendererRequestArgs,
    type RendererRequestData,
    RendererRequestEvents,
    type RendererRequestPayload,
} from "../../Common/WindowEventTypes.js";
import { GlobalLinks, unselectLink } from "../Components/Link.js";
import { Notification } from "../Components/Notification/index.js";
import {
    openDialog_AddRemote,
    openDialog_BranchFrom,
    openDialog_Clone,
    openDialog_compare,
    openDialog_createTag,
    openDialog_EditRemote,
    openDialog_fileHistory,
    openDialog_initRepo,
    openDialog_PushTag,
    openDialog_RenameRef,
    openDialog_Settings,
    openDialog_SetUpstream,
    openDialog_viewCommit,
} from "./Dialogs.js";
import { ipcGetData, ipcSendMessage, openNativeDialog, registerAppEventHandlers, registerHandler } from "./IPC.js";
import { clearLock, notify, setDiffpaneSrc, setLock, Store, store, type StoreType } from "./store.js";
import { loadStylesFromLocalstorage } from "./styles.js";

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
loadStylesFromLocalstorage();

ipcSendMessage(IpcAction.INIT, null);
ipcGetData(IpcAction.GET_SETTINGS, null).then(appConfig => {
    store.updateStore("appConfig", appConfig);
    store.updateStore("diffOptions", appConfig.diffOptions);
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

export function resolveConflict(path: string) {
    ipcSendMessage(IpcAction.RESOLVE_CONFLICT, { path });
}

export function checkoutBranch(branch: string) {
    setLock(Locks.MAIN);
    ipcSendMessage(IpcAction.CHECKOUT_BRANCH, branch);
}

export function openFile(
    params:
        & (
            | { sha: string; }
            | { workDir: true; type: "staged" | "unstaged"; }
            | { compare: true; }
        )
        & { patch: PatchObj; },
) {
    const currentFile: StoreType["currentFile"] = {
        patch: params.patch,
    };
    if ("sha" in params) {
        currentFile.commitSHA = params.sha;
    }
    if (!params.patch.hunks) {
        if ("sha" in params) {
            ipcSendMessage(IpcAction.LOAD_HUNKS, {
                sha: params.sha,
                path: params.patch.actualFile.path,
            });
        } else if ("compare" in params) {
            ipcSendMessage(IpcAction.LOAD_HUNKS, {
                compare: true,
                path: params.patch.actualFile.path,
            });
        } else {
            ipcSendMessage(IpcAction.LOAD_HUNKS, {
                workDir: true,
                path: params.patch.actualFile.path,
                type: params.type,
            });
        }
    }
    store.updateStore("currentFile", currentFile);
}
export function closeFile() {
    store.updateStore("currentFile", null);
    unselectLink(LinkTypes.FILES);
}

export function commit(params: IpcActionParams[IpcAction.COMMIT]) {
    return ipcGetData(IpcAction.COMMIT, params);
}

export function openFileHistory(file: string, sha?: string) {
    ipcSendMessage(IpcAction.LOAD_FILE_COMMITS, { file, cursor: sha, startAtCursor: true });
}

export async function showStash(index: number) {
    const patches = await ipcGetData(IpcAction.SHOW_STASH, index);
    store.updateStore("comparePatches", patches);
}

function repoOpened(result: AppEventData[AppEventType.REPO_OPENED]) {
    clearLock(Locks.MAIN);
    clearLock(Locks.BRANCH_LIST);
    clearLock(Locks.COMMIT_LIST);

    GlobalLinks[LinkTypes.COMMITS] = {};
    GlobalLinks[LinkTypes.BRANCHES] = {};
    GlobalLinks[LinkTypes.FILES] = {};

    unselectLink(LinkTypes.COMMITS);
    unselectLink(LinkTypes.BRANCHES);
    unselectLink(LinkTypes.FILES);

    store.updateStore("diffPaneSrc", null);
    store.updateStore("currentFile", null);
    store.updateStore("branches", null);
    store.updateStore("repo", {
        path: result.path,
    });
    store.updateStore("repoStatus", result.status);
    store.updateStore("selectedBranch", HEAD_REF);
}

function updateRepoStatus(result: AppEventData[AppEventType.REFRESH_WORKDIR]) {
    store.updateStore("repoStatus", result.status);
    store.updateStore("workDir", {
        staged: result.staged,
        unstaged: result.unstaged,
    });
}

export function openSettings() {
    openDialog_Settings();
}

function loadHunks(data: IpcResponse<IpcAction.LOAD_HUNKS>) {
    if (data instanceof Error) {
        return;
    }
    if (Store.currentFile && data.hunks) {
        const currentFile = Store.currentFile;
        currentFile.patch.hunks = data.hunks;
        store.updateStore("currentFile", currentFile);
    }
}

const branchMap: Map<string, BranchObj> = new Map();

function mapHeads(heads: StoreType["heads"], refs: BranchObj[]) {
    for (let i = 0, len = refs.length; i < len; ++i) {
        const ref = refs[i];
        branchMap.set(ref.name, ref);
        if (!heads.has(ref.headSHA)) {
            heads.set(ref.headSHA, []);
        }
        heads.get(ref.headSHA)?.push(ref);
    }
}
async function loadHEAD() {
    const head = await ipcGetData(IpcAction.LOAD_HEAD, null);
    store.updateStore("head", head);
}
async function loadUpstreams() {
    const upstreams = await ipcGetData(IpcAction.LOAD_UPSTREAMS, null);

    for (let i = 0, len = upstreams.length; i < len; ++i) {
        const upstream = upstreams[i];
        const branch = branchMap.get(upstream.name);
        if (branch) {
            branch.remote = upstream.remote;
            branch.status = upstream.status;
        }
    }
}
async function branchesLoaded(result: IpcResponse<IpcAction.LOAD_BRANCHES>) {
    clearLock(Locks.BRANCH_LIST);
    Store.heads.clear();
    branchMap.clear();

    if (result instanceof Error) {
        return;
    }

    mapHeads(Store.heads, result.local);
    mapHeads(Store.heads, result.remote);
    mapHeads(Store.heads, result.tags);

    loadHEAD();

    store.updateStore("branches", result);
    store.triggerStoreUpdate("heads");

    await loadUpstreams();
    store.triggerStoreUpdate("heads");
}
function stashLoaded(stash: IpcResponse<IpcAction.LOAD_STASHES>) {
    if (!stash || stash instanceof Error) {
        return;
    }
    store.updateStore("stash", stash);
}
function updateCurrentBranch(head: IpcResponse<IpcAction.CHECKOUT_BRANCH>) {
    clearLock(Locks.MAIN);
    if (head && !(head instanceof Error)) {
        store.updateStore("head", head);
    }
}

function handleCompareRevisions(data: AppEventData[AppEventType.OPEN_COMPARE_REVISIONS]) {
    if (data && !(data instanceof Error)) {
        unselectLink(LinkTypes.COMMITS);
        store.updateStore("comparePatches", data);
    }
}

function handleRemotes(remotes: IpcResponse<IpcAction.REMOTES>) {
    if (remotes instanceof Error) {
        return;
    }
    store.updateStore("remotes", remotes);
}

function handleFileCommits(data: IpcActionReturnOrError<IpcAction.LOAD_FILE_COMMITS>) {
    if (!data || data instanceof Error) {
        return;
    }
    store.updateStore("currentFile", {
        patch: {
            status: 0,
            hunks: [],
            newFile: { path: "", size: 0, mode: 0, flags: 0 },
            oldFile: { path: "", size: 0, mode: 0, flags: 0 },
            lineStats: { total_context: 0, total_additions: 0, total_deletions: 0 },
            actualFile: { path: data.filePath, size: 0, mode: 0, flags: 0 },
        },
        commitSHA: data.cursor,
    });
}

// FIXME: Should probably handle this better..
const fetchNotification: Record<string, Notification> = {};
function handleNotificationFetch(status: AppEventData[AppEventType.NOTIFY_FETCH_STATUS]) {
    if ("init" in status) {
        if (!fetchNotification[status.remote]) {
            fetchNotification[status.remote] = notify({ title: `Fetching remote '${status.remote}'`, time: 0 });
        }
        return;
    }

    if (!fetchNotification[status.remote]) {
        console.warn("notification for remote '%s' not initialized (?)", status.remote, status);
        return;
    }
    if ("done" in status) {
        if (status.done) {
            fetchNotification[status.remote].update({ body: <p>{status.update ? "Done" : "No update"}</p>, time: 3000 });
            delete fetchNotification[status.remote];
        }
    } else if (status.receivedObjects == status.totalObjects) {
        fetchNotification[status.remote].update({ body: <p>Resolving deltas {status.indexedDeltas}/{status.totalDeltas}</p> });
    } else if (status.totalObjects > 0) {
        fetchNotification[status.remote].update({
            body: (
                <p>Received {status.receivedObjects}/{status.totalObjects} objects ({status.indexedObjects}) in {humanReadableBytes(status.receivedBytes)}</p>
            ),
        });
    }
}
let pushNotification: null | Notification;
function handleNotificationPush(status: AppEventData[AppEventType.NOTIFY_PUSH_STATUS]) {
    if (!pushNotification) {
        pushNotification = notify({ title: "Pushing...", time: 0 });
    }
    if ("done" in status) {
        if (status.done) {
            pushNotification.update({ title: "Pushed", time: 3000 });
            pushNotification = null;
        }
    } else if (status.totalObjects > 0) {
        pushNotification.update({ body: <p>Pushed {status.transferedObjects}/{status.totalObjects} objects in {humanReadableBytes(status.bytes)}</p> });
    }
}

let cloneNotification: null | Notification;
function handleNotificationClone(status: AppEventData[AppEventType.NOTIFY_CLONE_STATUS]) {
    if (!cloneNotification) {
        cloneNotification = notify({ title: "Cloning...", time: 0 });
    }
    if ("done" in status) {
        if (status.done) {
            cloneNotification.update({
                title: "Cloned!",
                body: `Cloned '${status.source}' into '${status.target}'`,
                time: 3000,
            });
            cloneNotification = null;
        }
    } else if (status.receivedObjects == status.totalObjects) {
        cloneNotification.update({ body: <p>Resolving deltas {status.indexedDeltas}/{status.totalDeltas}</p> });
    } else if (status.totalObjects > 0) {
        cloneNotification.update({
            body: (
                <p>Received {status.receivedObjects}/{status.totalObjects} objects ({status.indexedObjects}) in {humanReadableBytes(status.receivedBytes)}</p>
            ),
        });
    }
}

registerAppEventHandlers({
    [AppEventType.REPO_OPENED]: repoOpened,
    [AppEventType.OPEN_SETTINGS]: openSettings,
    [AppEventType.LOCK_UI]: setLock,
    [AppEventType.UNLOCK_UI]: clearLock,
    [AppEventType.UNSELECT_LINK]: (linkType) => unselectLink(linkType),
    [AppEventType.SET_DIFFPANE]: (sha) => setDiffpaneSrc(sha),
    [AppEventType.NOTIFY]: notify,
    [AppEventType.NOTIFY_FETCH_STATUS]: handleNotificationFetch,
    [AppEventType.NOTIFY_PUSH_STATUS]: handleNotificationPush,
    [AppEventType.NOTIFY_CLONE_STATUS]: handleNotificationClone,
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
    [AppEventType.OPEN_COMPARE_REVISIONS]: handleCompareRevisions,
});

registerHandler(IpcAction.LOAD_BRANCHES, branchesLoaded);
registerHandler(IpcAction.CHECKOUT_BRANCH, updateCurrentBranch);
registerHandler(IpcAction.LOAD_HUNKS, loadHunks);
registerHandler(IpcAction.REMOTES, handleRemotes);
registerHandler(IpcAction.LOAD_PATCHES_WITHOUT_HUNKS, () => clearLock(Locks.COMMIT_LIST));
registerHandler(IpcAction.LOAD_STASHES, stashLoaded);
registerHandler(IpcAction.LOAD_FILE_COMMITS, handleFileCommits);

const rendererActions: {
    [E in RendererRequestEvents]: (data: RendererRequestArgs[E]) => Promise<null | RendererRequestData[E]>;
} = {
    [RendererRequestEvents.CLONE_DIALOG]: openDialog_Clone,
    [RendererRequestEvents.INIT_DIALOG]: openDialog_initRepo,
    [RendererRequestEvents.FILE_HISTORY_DIALOG]: openDialog_fileHistory,
    [RendererRequestEvents.GET_COMMIT_SHA_DIALOG]: openDialog_viewCommit,
    [RendererRequestEvents.COMPARE_REVISIONS_DIALOG]: openDialog_compare,
};

async function handleRequestClientData<E extends RendererRequestEvents>(payload: RendererRequestPayload<E>): Promise<RendererRequestData[E] | null> {
    return rendererActions[payload.event](payload.data);
}
window.electronAPI.requestClientData(handleRequestClientData);
