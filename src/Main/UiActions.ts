import { dialog } from "electron/main";

import { IpcAction, Locks, type IpcActionParams } from "../Common/Actions.js";
import { AppEventType } from "../Common/WindowEventTypes.js";
import { sendEvent } from "./WindowEvents.js";
import * as provider from "./Provider.js";
import { sendAction } from "./IPC.js";
import { currentRepo, getContext } from "./Context.js";

export async function pullHead() {
    const repo = currentRepo();
    sendEvent(AppEventType.LOCK_UI, Locks.BRANCH_LIST);
    const result = await provider.pullHead(repo);
    sendEvent(AppEventType.UNLOCK_UI, Locks.BRANCH_LIST);
    sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));

    return result;
}

export async function push(data: IpcActionParams[IpcAction.PUSH]) {
    const context = getContext();
    sendEvent(AppEventType.LOCK_UI, Locks.BRANCH_LIST);
    const result = await provider.push(context, data);
    if (result instanceof Error) {
        dialog.showErrorBox("Failed to push", result.message);
    } else {
        sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(context.repo));
    }
    sendEvent(AppEventType.UNLOCK_UI, Locks.BRANCH_LIST);

    return result;
}
export async function pushHead() {
    return push(null);
}
