import { remote } from "electron";
import { contextMenuState, checkoutBranch, pullHead } from "src/Data/Renderer/store";

const { Menu, MenuItem } = remote;

const originMenu = new Menu();
originMenu.append(new MenuItem({
    label: 'Fetch...',
    click() {
        console.log("fetch");
        return "fetch";
    }
}));

const remoteMenu = new Menu();
remoteMenu.append(new MenuItem({
    label: 'Checkout...',
    click() {
        console.log("Checkout");
    }
}));
remoteMenu.append(new MenuItem({
    label: 'Delete...',
    click() {
        console.log("Delete");
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
        checkoutBranch(contextMenuState.data.dataset.ref);
    }
}));
localMenu.append(new MenuItem({
    label: 'Create new branch...',
    click() {
        console.log("Create new branch");
    }
}));
localMenu.append(new MenuItem({
    label: 'Delete...',
    click() {
        console.log("Delete");
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

const headMenu = new Menu();
headMenu.append(new MenuItem({
    label: 'Push...',
    click() {
        console.log("Push");
    }
}));
headMenu.append(new MenuItem({
    label: 'Pull...',
    click() {
        console.log("Pull");
        pullHead();
    }
}));

export function showOriginMenu(e: any) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget;
    originMenu.popup({
        window: remote.getCurrentWindow()
    });
}
export function showRemoteMenu(e: any) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget;
    remoteMenu.popup({
        window: remote.getCurrentWindow()
    });
}
export function showLocalMenu(e: any) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget;
    localMenu.popup({
        window: remote.getCurrentWindow()
    });
}
export function showHeadMenu(e: any) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget;
    headMenu.popup({
        window: remote.getCurrentWindow()
    });
}
