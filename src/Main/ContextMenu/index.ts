import { IpcMainInvokeEvent } from "electron/main";
import { ContextMenu } from "../../Common/ContextMenu";
import { openHeadMenu, openLocalMenu, openRemoteMenu, openRemoteRefMenu, openRemotesMenu, openStashMenu, openTagMenu } from "./BranchMenu";
import { openCommitMenu } from "./CommitListMenu";
import { openFileHistoryContextMenu } from "./FileHistoryMenu";
import { openFileContextMenu } from "./FileMenu";

interface ContextMenuData {
    action: ContextMenu
    data: Record<string,string>
}

export function handleContextMenu(event: IpcMainInvokeEvent, data: ContextMenuData) {
    if (data.action === ContextMenu.FILE) {
        return openFileContextMenu(event, data.data);
    }

    if (data.action === ContextMenu.FILE_HISTORY) {
        return openFileHistoryContextMenu(event, data.data);
    }

    if (data.action === ContextMenu.REMOTE) {
        return openRemoteMenu(event, data.data);
    }

    if (data.action === ContextMenu.REMOTES) {
        return openRemotesMenu(event, data.data);
    }

    if (data.action === ContextMenu.REMOTE_REF) {
        return openRemoteRefMenu(event, data.data);
    }

    if (data.action === ContextMenu.HEAD) {
        return openHeadMenu(event, data.data);
    }

    if (data.action === ContextMenu.BRANCH_LOCAL) {
        return openLocalMenu(event, data.data);
    }

    if (data.action === ContextMenu.TAG) {
        return openTagMenu(event, data.data);
    }

    if (data.action === ContextMenu.STASH) {
        return openStashMenu(event, data.data);
    }

    if (data.action === ContextMenu.COMMIT) {
        return openCommitMenu(event, data.data);
    }
}
