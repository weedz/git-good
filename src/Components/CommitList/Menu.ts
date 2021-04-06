import { getCurrentWindow, Menu, MenuItem } from "@electron/remote";
import { h } from "preact";
import { IpcAction } from "src/Data/Actions";
import { BranchFromType, openDialog_BranchFrom } from "src/Data/Renderer/Dialogs";
import { ipcSendMessage } from "src/Data/Renderer/IPC";
import { contextMenuState } from "src/Data/Renderer/store";

const commitMenu = new Menu();
commitMenu.append(new MenuItem({
    label: 'Cherry-pick...',
    click() {
        console.log("Cherry-pick", contextMenuState.data.sha);
    }
}));
commitMenu.append(new MenuItem({
    label: 'Revert...',
    click() {
        console.log("Revert", contextMenuState.data.sha);
    }
}));
commitMenu.append(new MenuItem({
    label: 'Rebase...',
    click() {
        console.log("Rebase", contextMenuState.data.sha);
    }
}));
commitMenu.append(new MenuItem({
    label: 'Branch...',
    click() {
        const sha = contextMenuState.data.sha;
        openDialog_BranchFrom(sha, BranchFromType.COMMIT);
    }
}));
commitMenu.append(new MenuItem({
    label: 'Tag...',
    click() {
        console.log("Tag", contextMenuState.data.sha);
    }
}));
commitMenu.append(new MenuItem({
    label: 'Diff...',
    click() {
        console.log("Diff", contextMenuState.data.sha);
        ipcSendMessage(IpcAction.OPEN_COMPARE_REVISIONS, {
            to: "HEAD",
            from: contextMenuState.data.sha
        });
    }
}));
commitMenu.append(new MenuItem({
    label: 'Reset...',
    click() {
        console.log("Reset", contextMenuState.data.sha);
    }
}));

export function showCommitMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget.dataset as {[name: string]: string};
    commitMenu.popup({
        window: getCurrentWindow()
    });
}
