import { type IpcMainInvokeEvent } from "electron/main";
import { ContextMenu } from "../../Common/ContextMenu";
import { openHeadMenu, openLocalMenu, openRemoteMenu, openRemoteRefMenu, openRemotesMenu, openStashMenu, openTagMenu } from "./BranchMenu";
import { openCommitMenu } from "./CommitListMenu";
import { openFileHistoryContextMenu } from "./FileHistoryMenu";
import { openFileContextMenu } from "./FileMenu";

interface ContextMenuData {
    action: ContextMenu
    data: Record<string,string>
}

export function handleContextMenu(_: IpcMainInvokeEvent, data: ContextMenuData) {
    if (data.action === ContextMenu.FILE) {
        return openFileContextMenu(data.data);
    }

    if (data.action === ContextMenu.FILE_HISTORY) {
        return openFileHistoryContextMenu(data.data);
    }

    if (data.action === ContextMenu.REMOTE) {
        return openRemoteMenu(data.data);
    }

    if (data.action === ContextMenu.REMOTES) {
        return openRemotesMenu(data.data);
    }

    if (data.action === ContextMenu.REMOTE_REF) {
        return openRemoteRefMenu(data.data);
    }

    if (data.action === ContextMenu.HEAD) {
        return openHeadMenu(data.data);
    }

    if (data.action === ContextMenu.BRANCH_LOCAL) {
        return openLocalMenu(data.data);
    }

    if (data.action === ContextMenu.TAG) {
        return openTagMenu(data.data);
    }

    if (data.action === ContextMenu.STASH) {
        return openStashMenu(data.data);
    }

    if (data.action === ContextMenu.COMMIT) {
        return openCommitMenu(data.data);
    }
}
