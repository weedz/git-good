import { ipcRenderer } from "electron/renderer";
import { dialog } from "@electron/remote";
import { IpcAction, IpcActionParams, IpcActionReturn, IpcPayload, IpcResponse } from "../../Common/Actions";
import { WindowArguments, WindowEvents } from "../../Common/WindowEventTypes";

ipcRenderer.on("asynchronous-reply", handleMessage);
// We send null to callbacks when the action failed/returned an error
const callbackHandlers: Record<string, (args: IpcActionReturn[IpcAction] | null) => void> = {};

function handleMessage(_: unknown, payload: IpcPayload<IpcAction>) {
    if (payload.id && callbackHandlers[payload.id]) {
        if ("error" in payload) {
            callbackHandlers[payload.id](null);
        } else {
            callbackHandlers[payload.id](payload.data);
        }
        delete callbackHandlers[payload.id];
    }
    handleEvent(payload);
}

export function addWindowEventListener<T extends WindowEvents>(event: T, cb: (args: WindowArguments[T], event: T) => void) {
    ipcRenderer.on(event, (_, args) => cb(args, event));
}

export function ipcSendMessage<T extends IpcAction>(action: T, data: IpcActionParams[T]) {
    const id = (Math.random() * Number.MAX_SAFE_INTEGER)>>>0;
    ipcRenderer.send("asynchronous-message", {
        action,
        data,
        id,
    });
    return id;
}

export function ipcGetData<T extends IpcAction>(action: T, data: IpcActionParams[T]) {
    const id = ipcSendMessage(action, data);
    return new Promise<IpcActionReturn[T]>((resolve, _reject) => {
        // calbackHandlers get cleaned up in handleMessage()
        callbackHandlers[id] = resolve as unknown as (args: IpcActionReturn[IpcAction] | null) => void;
    });
}

type HandlerCallback = (arg: IpcResponse<IpcAction>) => void;

const handlers: {[T in IpcAction]: HandlerCallback[]} = {
    [IpcAction.INIT]: [],
    [IpcAction.LOAD_COMMITS]: [],
    [IpcAction.LOAD_FILE_COMMITS]: [],
    [IpcAction.LOAD_BRANCHES]: [],
    [IpcAction.LOAD_HEAD]: [],
    [IpcAction.LOAD_UPSTREAMS]: [],
    [IpcAction.OPEN_REPO]: [],
    [IpcAction.LOAD_COMMIT]: [],
    [IpcAction.LOAD_PATCHES_WITHOUT_HUNKS]: [],
    [IpcAction.LOAD_HUNKS]: [],
    [IpcAction.SHOW_STASH]: [],
    [IpcAction.CHECKOUT_BRANCH]: [],
    [IpcAction.REFRESH_WORKDIR]: [],
    [IpcAction.GET_CHANGES]: [],
    [IpcAction.STAGE_FILE]: [],
    [IpcAction.UNSTAGE_FILE]: [],
    [IpcAction.STAGE_ALL]: [],
    [IpcAction.UNSTAGE_ALL]: [],
    [IpcAction.DISCARD_FILE]: [],
    [IpcAction.COMMIT]: [],
    [IpcAction.PULL]: [],
    [IpcAction.PUSH]: [],
    [IpcAction.SET_UPSTREAM]: [],
    [IpcAction.CREATE_BRANCH]: [],
    [IpcAction.CREATE_BRANCH_FROM_REF]: [],
    [IpcAction.DELETE_REF]: [],
    [IpcAction.DELETE_REMOTE_REF]: [],
    [IpcAction.RENAME_LOCAL_BRANCH]: [],
    [IpcAction.FIND_FILE]: [],
    [IpcAction.ABORT_REBASE]: [],
    [IpcAction.CONTINUE_REBASE]: [],
    [IpcAction.OPEN_COMPARE_REVISIONS]: [],
    [IpcAction.REMOTES]: [],
    [IpcAction.RESOLVE_CONFLICT]: [],
    [IpcAction.EDIT_REMOTE]: [],
    [IpcAction.NEW_REMOTE]: [],
    [IpcAction.REMOVE_REMOTE]: [],
    [IpcAction.FETCH]: [],
    [IpcAction.SAVE_SETTINGS]: [],
    [IpcAction.GET_SETTINGS]: [],
    [IpcAction.REPO_PROFILE]: [],
    [IpcAction.FILE_DIFF_AT]: [],
    [IpcAction.CREATE_TAG]: [],
    [IpcAction.DELETE_TAG]: [],
    [IpcAction.PARSE_REVSPEC]: [],
    [IpcAction.LOAD_STASHES]: [],
    [IpcAction.STASH_POP]: [],
    [IpcAction.STASH_APPLY]: [],
    [IpcAction.STASH_DROP]: [],
};
export function registerHandler<T extends IpcAction>(action: T, callbacks: ((arg: IpcActionReturn[T]) => void) | (Array<(arg: IpcActionReturn[T]) => void>)) {
    if (!Array.isArray(callbacks)) {
        callbacks = [callbacks];
    }
    for (const cb of callbacks) {
        handlers[action].push(cb as HandlerCallback);
    }
    return () => unregisterHandler(action, callbacks);
}
export function unregisterHandler<T extends IpcAction>(action: T, callbacks: ((arg: IpcActionReturn[T]) => void) | (Array<(arg: IpcActionReturn[T]) => void>)) {
    if (!Array.isArray(callbacks)) {
        callbacks = [callbacks];
    }
    for (const cb of callbacks) {
        handlers[action].splice(handlers[action].indexOf(cb as HandlerCallback)>>>0, 1);
    }
}
function handleEvent<T extends IpcAction>(payload: IpcPayload<T>) {
    try {
        let data;
        if ("error" in payload) {
            dialog.showErrorBox(`Error ${payload.action}`, payload.error);
            console.warn(payload);
            data = false;
        } else {
            data = payload.data;
        }
        for (const handler of handlers[payload.action]) {
            handler(data);
        }
    } catch (e) {
        console.error(e);
        console.log(payload);
        dialog.showErrorBox(`Error ${payload.action}`, "Unknown error. Check devtools...");
    }
}
