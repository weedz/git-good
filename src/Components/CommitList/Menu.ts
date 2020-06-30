import { remote } from "electron";
import { contextMenuState } from "src/Data/Renderer/store";

const { Menu, MenuItem } = remote;

const commitMenu = new Menu();
commitMenu.append(new MenuItem({
    label: 'Cherry-pick...',
    click() {
        console.log("Cherry-pick", contextMenuState.data.dataset.sha);
    }
}));
commitMenu.append(new MenuItem({
    label: 'Revert...',
    click() {
        console.log("Revert", contextMenuState.data.dataset.sha);
    }
}));
commitMenu.append(new MenuItem({
    label: 'Rebase...',
    click() {
        console.log("Rebase", contextMenuState.data.dataset.sha);
    }
}));
commitMenu.append(new MenuItem({
    label: 'Create branch...',
    click() {
        console.log("Create branch", contextMenuState.data.dataset.sha);
    }
}));
commitMenu.append(new MenuItem({
    label: 'Diff...',
    click() {
        console.log("Diff", contextMenuState.data.dataset.sha);
    }
}));
commitMenu.append(new MenuItem({
    label: 'Reset...',
    click() {
        console.log("Reset", contextMenuState.data.dataset.sha);
    }
}));

export function showCommitMenu(e: any) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget;
    commitMenu.popup({
        window: remote.getCurrentWindow()
    });
}
