import { remote } from "electron";
import { contextMenuState, createBranch, openDialogWindow, closeDialogWindow } from "src/Data/Renderer/store";

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
    label: 'Branch...',
    click() {
        const sha = contextMenuState.data.dataset.sha;
        openDialogWindow({
            title: "New branch",
            confirmCb(data: any) {
                if (data.branchName) {
                    createBranch(sha, data.branchName);
                }
                closeDialogWindow();
            },
            cancelCb() {
                closeDialogWindow();
            }
        });
    }
}));
commitMenu.append(new MenuItem({
    label: 'Tag...',
    click() {
        console.log("Tag", contextMenuState.data.dataset.sha);
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
