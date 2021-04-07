import { Menu, MenuItem, dialog, getCurrentWindow } from "@electron/remote";
import { h } from "preact";
import { RefType } from "src/Data/Actions";
import { pullHead, pushHead } from "src/Data/Renderer";
import { BranchFromType, openDialog_BranchFrom, openDialog_SetUpstream, openDialog_RenameRef, BranchType } from "src/Data/Renderer/Dialogs";
import { contextMenuState, checkoutBranch, deleteBranch, deleteRemoteBranch, Store } from "src/Data/Renderer/store";

const setUpstreamMenuItem = new MenuItem({
    label: 'Set upstream...',
    click() {
        const local = contextMenuState.data.ref;
        openDialog_SetUpstream(local, contextMenuState.data.remote);
    }
})

const remotesMenu = new Menu();
remotesMenu.append(new MenuItem({
    label: "Add remote...",
    click() {
        console.log("add remote")
        return;
    }
}))

const remoteMenu = new Menu();
remoteMenu.append(new MenuItem({
    label: 'Fetch...',
    click() {
        console.log("fetch");
        return;
    }
}));
remoteMenu.append(new MenuItem({
    type: "separator"
}));
remoteMenu.append(new MenuItem({
    label: 'Edit...',
    click() {
        console.log("edit");
        return;
    }
}));
remoteMenu.append(new MenuItem({
    label: 'Remote...',
    click() {
        console.log("remote");
        return;
    }
}));

const newBranch = new MenuItem({
    label: 'Create new branch...',
    click() {
        const sha = contextMenuState.data.ref;
        openDialog_BranchFrom(sha, BranchFromType.REF);
    }
});

const remoteRefMenu = new Menu();
remoteRefMenu.append(newBranch);
remoteRefMenu.append(new MenuItem({
    label: 'Delete...',
    async click() {
        const refName = contextMenuState.data.ref;
        const result = await dialog.showMessageBox({
            message: `Delete branch ${refName}?`,
            type: "question",
            buttons: ["Confirm", "Cancel"],
            cancelId: 1,
        });
        if (result.response === 0) {
            deleteRemoteBranch(refName);
        }
    }
}));
remoteRefMenu.append(new MenuItem({
    label: 'Rebase...',
    click() {
        console.log("Rebase");
    }
}));
remoteRefMenu.append(new MenuItem({
    label: 'Merge...',
    click() {
        console.log("Merge");
    }
}));

const localMenu = new Menu();
localMenu.append(new MenuItem({
    label: 'Checkout...',
    click() {
        checkoutBranch(contextMenuState.data.ref);
    }
}));
localMenu.append(newBranch);
localMenu.append(new MenuItem({
    label: 'Delete...',
    async click() {
        const refName = contextMenuState.data.ref;
        const result = await dialog.showMessageBox({
            message: `Delete branch ${refName}?`,
            type: "question",
            buttons: ["Confirm", "Cancel"],
            cancelId: 1,
        });
        if (result.response === 0) {
            deleteBranch(refName);
        }
    }
}));
localMenu.append(new MenuItem({
    label: 'Rename...',
    click() {
        const refName = contextMenuState.data.ref;
        openDialog_RenameRef(refName, BranchType.LOCAL);
    }
}));
localMenu.append(new MenuItem({
    label: 'Rebase...',
    click() {
        console.log("Rebase");
    }
}));
localMenu.append(new MenuItem({
    label: 'Merge...',
    click() {
        console.log("Merge");
    }
}));
localMenu.append(setUpstreamMenuItem);

const headMenu = new Menu();
headMenu.append(new MenuItem({
    label: 'Pull...',
    click() {
        const ref = contextMenuState.data.ref;
        const headSHA = Store.head?.headSHA;
        if (!headSHA) {
            return dialog.showErrorBox("Invalid reference", ref);
        }

        const head = Store.heads[headSHA].find(head => head.name === ref);

        if (!head?.remote) {
            return dialog.showErrorBox("Missing remote.", ref);
        }
        pullHead();
    }
}));
headMenu.append(new MenuItem({
    label: 'Push...',
    click() {
        pushHead();
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
