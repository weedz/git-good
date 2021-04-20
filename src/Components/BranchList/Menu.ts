import { Menu, MenuItem, dialog, getCurrentWindow } from "@electron/remote";
import { h } from "preact";
import { IpcAction } from "src/Data/Actions";
import { pull, push } from "src/Data/Renderer";
import { BranchFromType, openDialog_BranchFrom, openDialog_SetUpstream, openDialog_RenameRef, BranchType, openDialog_EditRemote, openDialog_AddRemote } from "src/Data/Renderer/Dialogs";
import { ipcGetData, ipcSendMessage } from "src/Data/Renderer/IPC";
import { contextMenuState, checkoutBranch, deleteBranch, deleteRemoteBranch } from "src/Data/Renderer/store";

const setUpstreamMenuItem = new MenuItem({
    label: "Set upstream...",
    click() {
        const local = contextMenuState.data.ref;
        openDialog_SetUpstream(local, contextMenuState.data.remote);
    }
})

const remotesMenu = new Menu();
remotesMenu.append(new MenuItem({
    label: "Fetch all",
    async click() {
        const result = await ipcGetData(IpcAction.FETCH, null);
        if (!result) {
            dialog.showErrorBox("Failed to fetch remote", "Failed to fetch remote");
        }
    }
}));
remotesMenu.append(new MenuItem({
    type: "separator",
}));
remotesMenu.append(new MenuItem({
    label: "Add remote...",
    click() {
        openDialog_AddRemote();
    }
}));

const remoteMenu = new Menu();
remoteMenu.append(new MenuItem({
    label: "Fetch",
    async click() {
        const result = await ipcGetData(IpcAction.FETCH, {remote: contextMenuState.data.remote});
        if (!result) {
            dialog.showErrorBox("Failed to fetch remote", "Failed to fetch remote");
        }
    }
}));
remoteMenu.append(new MenuItem({
    type: "separator"
}));
remoteMenu.append(new MenuItem({
    label: "Edit...",
    async click() {
        const remotes = await ipcGetData(IpcAction.REMOTES, null);
        const remote = remotes.find(item => item.name === contextMenuState.data.remote);
        if (!remote) {
            dialog.showErrorBox("Error", `Could not find remote '${contextMenuState.data.remote}'`);
            return;
        }
        openDialog_EditRemote(remote);
    }
}));
remoteMenu.append(new MenuItem({
    label: "Remove",
    async click() {
        const result = await dialog.showMessageBox({
            message: `Delete remote ${contextMenuState.data.remote}?`,
            type: "question",
            buttons: ["Cancel", "Confirm"],
            cancelId: 0,
        });
        if (result.response === 1) {
            ipcSendMessage(IpcAction.REMOVE_REMOTE, {name: contextMenuState.data.remote});
        }
    }
}));

const newBranch = new MenuItem({
    label: "Create new branch...",
    click() {
        const sha = contextMenuState.data.ref;
        openDialog_BranchFrom(sha, BranchFromType.REF);
    }
});

const remoteRefMenu = new Menu();
remoteRefMenu.append(newBranch);
remoteRefMenu.append(new MenuItem({
    label: "Delete",
    async click() {
        const refName = contextMenuState.data.ref;
        const result = await dialog.showMessageBox({
            message: `Delete branch ${refName}?`,
            type: "question",
            buttons: ["Cancel", "Confirm"],
            cancelId: 0,
        });
        if (result.response === 1) {
            deleteRemoteBranch(refName);
        }
    }
}));

const localMenu = new Menu();
localMenu.append(new MenuItem({
    label: "Checkout",
    click() {
        checkoutBranch(contextMenuState.data.ref);
    }
}));
localMenu.append(new MenuItem({
    label: "Pull",
    click() {
        const refName = contextMenuState.data.ref;
        pull(refName);
    }
}));
localMenu.append(setUpstreamMenuItem);
localMenu.append(new MenuItem({
    type: "separator",
}));
localMenu.append(newBranch);
localMenu.append(new MenuItem({
    label: "Rename...",
    click() {
        const refName = contextMenuState.data.ref;
        openDialog_RenameRef(refName, BranchType.LOCAL);
    }
}));
localMenu.append(new MenuItem({
    label: "Delete",
    async click() {
        const refName = contextMenuState.data.ref;
        const result = await dialog.showMessageBox({
            message: `Delete branch ${refName}?`,
            type: "question",
            buttons: ["Cancel", "Confirm"],
            cancelId: 0,
        });
        if (result.response === 1) {
            deleteBranch(refName);
        }
    }
}));

const headMenu = new Menu();
headMenu.append(new MenuItem({
    label: "Pull",
    click() {
        pull(null);
    }
}));
headMenu.append(new MenuItem({
    label: "Push",
    click() {
        push();
    }
}));
headMenu.append(setUpstreamMenuItem);

const tagMenu = new Menu();
tagMenu.append(newBranch);

export function showRemotesMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget.dataset as {[name: string]: string};
    remotesMenu.popup({
        window: getCurrentWindow()
    });
}
export function showRemoteMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget.dataset as {[name: string]: string};
    remoteMenu.popup({
        window: getCurrentWindow()
    });
}
export function showRemoteRefMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget.dataset as {[name: string]: string};
    remoteRefMenu.popup({
        window: getCurrentWindow()
    });
}
export function showLocalMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget.dataset as {[name: string]: string};
    localMenu.popup({
        window: getCurrentWindow()
    });
}
export function showHeadMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget.dataset as {[name: string]: string};
    headMenu.popup({
        window: getCurrentWindow()
    });
}
export function showTagMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget.dataset as {[name: string]: string};
    tagMenu.popup({
        window: getCurrentWindow()
    });
}
