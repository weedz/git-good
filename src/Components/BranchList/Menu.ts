import { remote } from "electron";
import { h } from "preact";
import { RefType } from "src/Data/Actions";
import { pullHead } from "src/Data/Renderer";
import { BranchFromType, openDialog_BranchFrom, openDialog_SetUpstream } from "src/Data/Renderer/Dialogs";
import { contextMenuState, checkoutBranch, deleteBranch, deleteRemoteBranch, Store, push } from "src/Data/Renderer/store";

const { Menu, MenuItem } = remote;

const setUpstreamMenuItem = new MenuItem({
    label: 'Set upstream...',
    click() {
        const local = contextMenuState.data.ref;
        openDialog_SetUpstream(local);
    }
})

const originMenu = new Menu();
originMenu.append(new MenuItem({
    label: 'Fetch...',
    click() {
        console.log("fetch");
        return "fetch";
    }
}));

const newBranch = new MenuItem({
    label: 'Create new branch...',
    click() {
        console.log("Create new branch");
        const sha = contextMenuState.data.ref;
        openDialog_BranchFrom(sha, BranchFromType.REF);
    }
});

const remoteMenu = new Menu();
remoteMenu.append(newBranch);
remoteMenu.append(new MenuItem({
    label: 'Delete...',
    async click() {
        const refName = contextMenuState.data.ref;
        const result = await remote.dialog.showMessageBox({
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
remoteMenu.append(new MenuItem({
    label: 'Rebase...',
    click() {
        console.log("Rebase");
    }
}));
remoteMenu.append(new MenuItem({
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
        const result = await remote.dialog.showMessageBox({
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
        console.log("Rename");
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
        pullHead();
    }
}));
headMenu.append(new MenuItem({
    label: 'Push...',
    async click() {
        const ref = contextMenuState.data.ref;
        const headSHA = Store.branches.head?.headSHA;
        if (!headSHA) {
            return remote.dialog.showErrorBox("Invalid reference", ref);
        }

        const head = Store.heads[headSHA].filter(head => head.type === RefType.LOCAL)[0];
        if (!head.remote) {
            return remote.dialog.showErrorBox("Missing remote.", ref);
        }

        if (head.status?.behind) {
            const result = await remote.dialog.showMessageBox({
                title: "Force push?",
                message: `'${ref}' is behind the remote '${head.remote}'. Force push?`,
                type: "question",
                buttons: ["Yes", "No"],
                cancelId: 1,
            });
            if (result.response === 0) {
                push("origin", ref, undefined, true);
            }
        } else {
            push("origin", ref);
        }
    }
}));
headMenu.append(setUpstreamMenuItem);

const tagMenu = new Menu();
tagMenu.append(newBranch);

export function showOriginMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget.dataset as {[name: string]: string};
    originMenu.popup({
        window: remote.getCurrentWindow()
    });
}
export function showRemoteMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget.dataset as {[name: string]: string};
    remoteMenu.popup({
        window: remote.getCurrentWindow()
    });
}
export function showLocalMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget.dataset as {[name: string]: string};
    localMenu.popup({
        window: remote.getCurrentWindow()
    });
}
export function showHeadMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget.dataset as {[name: string]: string};
    headMenu.popup({
        window: remote.getCurrentWindow()
    });
}
export function showTagMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget.dataset as {[name: string]: string};
    tagMenu.popup({
        window: remote.getCurrentWindow()
    });
}
