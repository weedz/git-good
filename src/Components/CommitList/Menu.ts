import { getCurrentWindow, Menu, MenuItem } from "@electron/remote";
import { clipboard } from "electron";
import { h } from "preact";
import { IpcAction } from "../../Data/Actions";
import { BranchFromType, openDialog_BranchFrom, openDialog_createTag } from "../../Data/Renderer/Dialogs";
import { ipcSendMessage } from "../../Data/Renderer/IPC";
import { contextMenuState } from "../../Data/Renderer/store";
import { unselectLink } from "../Link";

const commitMenu = new Menu();
commitMenu.append(new MenuItem({
    label: 'Branch...',
    click() {
        const sha = contextMenuState.data.sha;
        openDialog_BranchFrom(sha, BranchFromType.COMMIT);
    }
}));
commitMenu.append(new MenuItem({
    label: 'Diff...',
    click() {
        unselectLink("commits");
        ipcSendMessage(IpcAction.OPEN_COMPARE_REVISIONS, {
            to: "HEAD",
            from: contextMenuState.data.sha
        });
    }
}));
commitMenu.append(new MenuItem({
    type: "separator"
}));
commitMenu.append(new MenuItem({
    label: "Create tag here...",
    click() {
        openDialog_createTag(contextMenuState.data.sha, true);
    }
}));
commitMenu.append(new MenuItem({
    type: "separator"
}));
commitMenu.append(new MenuItem({
    label: 'Copy sha',
    click() {
        const sha = contextMenuState.data.sha;
        clipboard.writeText(sha);
    }
}));

export function showCommitMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget.dataset as {[name: string]: string};
    commitMenu.popup({
        window: getCurrentWindow()
    });
}
