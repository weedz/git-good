import { getCurrentWindow, Menu, MenuItem, clipboard } from "@electron/remote";
import { h } from "preact";
import { IpcAction } from "../../../Common/Actions";
import { getContextMenuData, setContextMenuData } from "../../Data/ContextMenu";
import { BranchFromType, openDialog_BranchFrom, openDialog_createTag } from "../../Data/Dialogs";
import { ipcSendMessage } from "../../Data/IPC";
import { unselectLink } from "../Link";

const commitMenu = new Menu();
commitMenu.append(new MenuItem({
    label: "Branch...",
    click() {
        const sha = getContextMenuData().sha;
        openDialog_BranchFrom(sha, BranchFromType.COMMIT);
    }
}));
commitMenu.append(new MenuItem({
    label: "Diff...",
    click() {
        unselectLink("commits");
        ipcSendMessage(IpcAction.OPEN_COMPARE_REVISIONS, {
            to: "HEAD",
            from: getContextMenuData().sha
        });
    }
}));
commitMenu.append(new MenuItem({
    type: "separator"
}));
commitMenu.append(new MenuItem({
    label: "Create tag here...",
    click() {
        openDialog_createTag(getContextMenuData().sha, true);
    }
}));
commitMenu.append(new MenuItem({
    type: "separator"
}));
commitMenu.append(new MenuItem({
    label: "Copy sha",
    click() {
        const sha = getContextMenuData().sha;
        clipboard.writeText(sha);
    }
}));

export function showCommitMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    setContextMenuData(e.currentTarget.dataset as {[name: string]: string});
    commitMenu.popup({
        window: getCurrentWindow()
    });
}
