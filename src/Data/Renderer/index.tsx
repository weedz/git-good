import { h } from "preact";
import { Diff } from "nodegit";
import { dialog } from "@electron/remote";
import { ipcRenderer } from "electron/renderer";
import { GlobalLinks, unselectLink } from "../../Components/Link";
import { BranchObj, IpcAction, IpcActionReturn, IpcResponse, Locks, RepoStatus } from "../Actions";
import { openDialog_CompareRevisions, openDialog_Settings, openDialog_ViewCommit } from "./Dialogs";
import { addWindowEventListener, registerHandler, ipcSendMessage, ipcGetData } from "./IPC";
import { Store, clearLock, setLock, updateStore, StoreType, notify, openDialogWindow, closeDialogWindow } from "./store";
import { Notification } from "../../Components/Notification";
import { humanReadableBytes } from "../Utils";
import { RendererRequestArgs, RendererRequestData, RendererRequestEvents, RendererRequestPayload, WindowArguments } from "../WindowEventTypes";
import { DialogTypes } from "../../Components/Dialog/types";

let refreshingWorkdir = false;

window.addEventListener("focus", async () => {
    if (!Store.locks[Locks.MAIN] && Store.uiConfig?.refreshWorkdirOnFocus) {
        refreshWorkdir();
    }
});

// Glyph properties
let _glyphWidth = 7.81;
calculateGlyphWidth(13, 'JetBrainsMonoNL Nerd Font Mono');

ipcGetData(IpcAction.INIT, null).then(init => {
    if (init.repo) {
        repoOpened(init.repo);
    }
});
ipcGetData(IpcAction.GET_SETTINGS, null).then(config => {
    updateStore({
        uiConfig: config["ui"]
    })
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

export async function refreshWorkdir() {
    if (!Store.repo || refreshingWorkdir) {
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

let branchMap: Record<string, BranchObj> = {};

function mapHeads(heads: StoreType["heads"], refs: BranchObj[]) {
    for (const ref of refs) {
        branchMap[ref.name] = ref;
        if (!heads[ref.headSHA]) {
            heads[ref.headSHA] = [];
        }
        heads[ref.headSHA].push(ref);
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
        if (upstream.name in branchMap) {
            branchMap[upstream.name].remote = upstream.remote;
            branchMap[upstream.name].status = upstream.status;
        }
    }
}
function branchesLoaded(result: IpcActionReturn[IpcAction.LOAD_BRANCHES]) {
    clearLock(Locks.BRANCH_LIST);
    const heads: StoreType["heads"] = {};

    branchMap = {};

    mapHeads(heads, result.local);
    mapHeads(heads, result.remote);
    mapHeads(heads, result.tags);
    updateStore({
        branches: result,
        heads,
    });

    loadHEAD();
}
function stashLoaded(stash: IpcActionReturn[IpcAction.LOAD_STASHES]) {
    updateStore({
        stash
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

function handlePullHead(res: IpcActionReturn[IpcAction.PULL]) {
    if (res) {
        loadBranches();
    }
}

function handleStashChanged(res: WindowArguments["stash-changed"]) {
    switch (res.action) {
        case "stash": {
            notify({title: "Stashed changes"});
            refreshWorkdir();
            loadStashes();
            break;
        }
        case "pop": {
            notify({title: `Popped stash@{${res.index}}`});
            refreshWorkdir();
            loadStashes();
            break;
        }
        case "apply": {
            notify({title: `Applied stash@{${res.index}}`});
            refreshWorkdir();
            break;
        }
        case "drop": {
            notify({title: `Dropped stash@{${res.index}}`});
            loadStashes();
            break;
        }
    }
}

addWindowEventListener("repo-opened", repoOpened);
addWindowEventListener("refresh-workdir", refreshWorkdir);
addWindowEventListener("open-settings", openSettings);
addWindowEventListener("app-lock-ui", setLock);
addWindowEventListener("app-unlock-ui", clearLock);
addWindowEventListener("begin-compare-revisions", openDialog_CompareRevisions);
addWindowEventListener("begin-view-commit", openDialog_ViewCommit);
addWindowEventListener("stash-changed", handleStashChanged);
addWindowEventListener("notify", notify);

// FIXME: Should probably handle this better..
{
    let fetchNotification: null | Notification;
    addWindowEventListener("fetch-status", stats => {
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
    addWindowEventListener("push-status", stats => {
        if (!pushNotification) {
            pushNotification = notify({title: "Pushing...", time: 0});
        }
        if ("done" in stats) {
            if (stats.done) {
                pushNotification.update({title: "Pushed", time: 3000});
                pushNotification = null;
            }
        } else if (stats.totalObjects > 0) {
            pushNotification.update({body: <p>Pushed {stats.transferedObjects}/{stats.totalObjects} objects in {humanReadableBytes(stats.bytes)}</p>});
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
registerHandler(IpcAction.DELETE_TAG, loadBranches);
registerHandler(IpcAction.LOAD_PATCHES_WITHOUT_HUNKS, () => clearLock(Locks.COMMIT_LIST));
registerHandler(IpcAction.LOAD_STASHES, stashLoaded);


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
ipcRenderer.on("request-client-data", handleRequestClientData);
async function handleRequestClientData<E extends RendererRequestEvents>(_: unknown, payload: RendererRequestPayload<E>) {
    const response = await rendererActions[payload.event](payload.data).catch(e => Error(e));

    ipcRenderer.send("response-client-data", {
        id: payload.id,
        data: response,
    });
}
