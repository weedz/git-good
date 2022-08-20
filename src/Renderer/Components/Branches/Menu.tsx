import { dialog, getCurrentWindow, Menu, MenuItem } from "@electron/remote";
import { h } from "preact";
import { IpcAction } from "../../../Common/Actions";
import { pull, push } from "../../Data";
import { getContextMenuData, setContextMenuData } from "../../Data/ContextMenu";
import { BranchFromType, BranchType, openDialog_AddRemote, openDialog_BranchFrom, openDialog_createTag, openDialog_EditRemote, openDialog_PushTag, openDialog_RenameRef, openDialog_SetUpstream } from "../../Data/Dialogs";
import { ipcGetData, ipcSendMessage } from "../../Data/IPC";
import { checkoutBranch, deleteBranch, deleteRemoteBranch, deleteTag, notify, Store } from "../../Data/store";


async function menuActionPullChanges(refName: string | null) {
    const n = notify({title: "Pulling changes..."});

    const pullResult = await pull(refName);

    if (pullResult) {
        n.update({body: <p>Done!</p>, time: 2000});
    } else {
        n.update({body: <p>Failed...</p>, time: 2000});
    }
}

const setUpstreamMenuItem = new MenuItem({
    label: "Set upstream...",
    click() {
        const local = getContextMenuData().ref;
        openDialog_SetUpstream(local, getContextMenuData().remote);
    }
});
const createTag = new MenuItem({
    label: "Create tag here...",
    click() {
        openDialog_createTag(getContextMenuData().ref);
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
        const result = await ipcGetData(IpcAction.FETCH, {remote: getContextMenuData().remote});
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
        const remote = remotes.find(item => item.name === getContextMenuData().remote);
        if (!remote) {
            dialog.showErrorBox("Error", `Could not find remote '${getContextMenuData().remote}'`);
            return;
        }
        openDialog_EditRemote(remote);
    }
}));
remoteMenu.append(new MenuItem({
    label: "Remove",
    async click() {
        const result = await dialog.showMessageBox({
            message: `Delete remote ${getContextMenuData().remote}?`,
            type: "question",
            buttons: ["Cancel", "Delete"],
            cancelId: 0,
        });
        if (result.response === 1) {
            ipcSendMessage(IpcAction.REMOVE_REMOTE, {name: getContextMenuData().remote});
        }
    }
}));

const newBranch = new MenuItem({
    label: "Create new branch...",
    click() {
        const sha = getContextMenuData().ref;
        openDialog_BranchFrom(sha, BranchFromType.REF);
    }
});

const remoteRefMenu = new Menu();
remoteRefMenu.append(newBranch);
remoteRefMenu.append(new MenuItem({
    label: "Delete",
    async click() {
        const refName = getContextMenuData().ref;
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
        checkoutBranch(getContextMenuData().ref);
    }
}));
localMenu.append(new MenuItem({
    label: "Pull",
    click() {
        menuActionPullChanges(getContextMenuData().ref);
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
        const refName = getContextMenuData().ref;
        openDialog_RenameRef(refName, BranchType.LOCAL);
    }
}));
localMenu.append(new MenuItem({
    label: "Delete",
    async click() {
        const refName = getContextMenuData().ref;
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
    click() {
        menuActionPullChanges(null);
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
headMenu.append(newBranch);
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
            return openDialog_PushTag(getContextMenuData().ref);
        }
        const n = notify({ title: "Pushing tag", time: 0 });
        await ipcGetData(IpcAction.PUSH, {
            remote: Store.remotes[0].name,
            localBranch: getContextMenuData().ref
        });
        n.update({body: <p>Tag '{getContextMenuData().ref}' successfully pushed to remote {Store.remotes[0].name}</p>, time: 3000});
    }
}));
tagMenu.append(new MenuItem({
    type: "separator"
}));
tagMenu.append(new MenuItem({
    label: "Delete",
    async click() {
        const refName = getContextMenuData().ref;
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

const stashMenu = new Menu();
stashMenu.append(new MenuItem({
    label: "Apply",
    click() {
        const index = getContextMenuData().index;
        ipcSendMessage(IpcAction.STASH_APPLY, Number.parseInt(index, 10));
    }
}));
stashMenu.append(new MenuItem({
    label: "Pop",
    click() {
        const index = getContextMenuData().index;
        ipcSendMessage(IpcAction.STASH_POP, Number.parseInt(index, 10));
    }
}));
stashMenu.append(new MenuItem({
    label: "Drop",
    click() {
        const index = getContextMenuData().index;
        ipcSendMessage(IpcAction.STASH_DROP, Number.parseInt(index, 10));
    }
}));

export function showRemotesMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();

    setContextMenuData(e.currentTarget.dataset as {[name: string]: string})
    remotesMenu.popup({
        window: getCurrentWindow()
    });
}
export function showRemoteMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    setContextMenuData(e.currentTarget.dataset as {[name: string]: string});
    remoteMenu.popup({
        window: getCurrentWindow()
    });
}
export function showRemoteRefMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    setContextMenuData(e.currentTarget.dataset as {[name: string]: string});
    remoteRefMenu.popup({
        window: getCurrentWindow()
    });
}
export function showLocalMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    setContextMenuData(e.currentTarget.dataset as {[name: string]: string});
    localMenu.popup({
        window: getCurrentWindow()
    });
}
export function showHeadMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    setContextMenuData(e.currentTarget.dataset as {[name: string]: string});
    headMenu.popup({
        window: getCurrentWindow()
    });
}
export function showTagMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    setContextMenuData(e.currentTarget.dataset as {[name: string]: string});
    tagMenu.popup({
        window: getCurrentWindow()
    });
}

export function showStashMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    setContextMenuData(e.currentTarget.dataset as {[name: string]: string});
    stashMenu.popup({
        window: getCurrentWindow()
    });
}
