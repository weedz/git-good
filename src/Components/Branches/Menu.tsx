import { Menu, MenuItem, dialog, getCurrentWindow } from "@electron/remote";
import { h } from "preact";
import { IpcAction } from "src/Data/Actions";
import { pull, push } from "src/Data/Renderer";
import { BranchFromType, openDialog_BranchFrom, openDialog_SetUpstream, openDialog_RenameRef, BranchType, openDialog_EditRemote, openDialog_AddRemote, openDialog_createTag, openDialog_PushTag } from "src/Data/Renderer/Dialogs";
import { ipcGetData, ipcSendMessage } from "src/Data/Renderer/IPC";
import { contextMenuState, checkoutBranch, deleteBranch, deleteRemoteBranch, Store, deleteTag, notify } from "src/Data/Renderer/store";

const setUpstreamMenuItem = new MenuItem({
    label: "Set upstream...",
    click() {
        const local = contextMenuState.data.ref;
        openDialog_SetUpstream(local, contextMenuState.data.remote);
    }
});
const createTag = new MenuItem({
    label: "Create tag here...",
    click() {
        openDialog_createTag(contextMenuState.data.ref);
    }
});

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
            buttons: ["Cancel", "Delete"],
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
            buttons: ["Cancel", "Delete"],
            cancelId: 0,
        });
        if (result.response === 1) {
            const n = notify({ title: "Deleting branch" });
            await deleteRemoteBranch(refName);
            n.update({title: "Branch deleted", body: <p>Branch '{refName}' deleted from remote</p>, time: 3000});
        }
    }
}));
remoteRefMenu.append(new MenuItem({
    type: "separator"
}));
remoteRefMenu.append(createTag);

const localMenu = new Menu();
localMenu.append(new MenuItem({
    label: "Checkout",
    click() {
        checkoutBranch(contextMenuState.data.ref);
    }
}));
localMenu.append(new MenuItem({
    label: "Pull",
    async click() {
        const refName = contextMenuState.data.ref;
        const n = notify({title: "Pulling changes..."});
        await pull(refName);
        n.update({body: <p>Done!</p>, time: 2000});
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
            buttons: ["Cancel", "Delete"],
            cancelId: 0,
        });
        if (result.response === 1) {
            const n = notify({ title: "Deleting branch", time: 0 });
            await deleteBranch(refName);
            n.update({title: "Branch deleted", body: <p>Branch '{refName}' deleted</p>, time: 3000});
        }
    }
}));
localMenu.append(new MenuItem({
    type: "separator"
}));
localMenu.append(createTag);

const headMenu = new Menu();
headMenu.append(new MenuItem({
    label: "Pull",
    async click() {
        const n = notify({title: "Pulling changes..."});
        await pull(null);
        n.update({body: <p>Done!</p>, time: 2000});
    }
}));
headMenu.append(new MenuItem({
    label: "Push",
    click() {
        push();
    }
}));
headMenu.append(setUpstreamMenuItem);
headMenu.append(new MenuItem({
    type: "separator"
}));
headMenu.append(createTag);

const tagMenu = new Menu();
tagMenu.append(newBranch);
tagMenu.append(new MenuItem({
    label: "Push to remote...",
    async click() {
        if (Store.remotes.length > 1) {
            return openDialog_PushTag(contextMenuState.data.ref);
        }
        const n = notify({ title: "Pushing tag", time: 0 });
        await ipcGetData(IpcAction.PUSH, {
            remote: Store.remotes[0].name,
            localBranch: contextMenuState.data.ref
        });
        n.update({body: <p>Tag '{contextMenuState.data.ref}' successfully pushed to remote {Store.remotes[0].name}</p>, time: 3000});
    }
}));
tagMenu.append(new MenuItem({
    type: "separator"
}));
tagMenu.append(new MenuItem({
    label: "Delete",
    async click() {
        const refName = contextMenuState.data.ref;
        const result = await dialog.showMessageBox({
            message: `Delete tag ${refName}?`,
            type: "question",
            buttons: ["Cancel", "Delete"],
            cancelId: 0,
            checkboxLabel: "Delete from remote?",
        });
        if (result.response === 1) {
            const n = notify({title: "Deleting tag", time: 0});
            await deleteTag(refName, result.checkboxChecked);
            n.update({title: "Tag deleted", body: <p>Tag {refName} deleted</p>, time: 3000});
        }
    }
}));

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
