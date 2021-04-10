import { ipcRenderer } from "electron";
import { dialog } from "@electron/remote";
import { v4 as uuidv4 } from "uuid";
import { IpcAction, IpcActionParams, IpcActionReturn, IpcActionReturnError } from "../Actions";
import { WindowArguments, WindowEvents } from "../WindowEventTypes";

ipcRenderer.on("asynchronous-reply", handleMessage);
const callbackHandlers: Record<string, (args: IpcActionReturn[IpcAction]) => void> = {};

function handleMessage<T extends IpcAction>(_: unknown, payload: {id?: string, action: T, data: IpcActionReturn[T] | IpcActionReturnError}) {
    if (payload.id && callbackHandlers[payload.id]) {
        callbackHandlers[payload.id](payload.data);
        delete callbackHandlers[payload.id];
    }
    handleEvent(payload);
}

export function addWindowEventListener<T extends WindowEvents>(event: T, cb: (args: WindowArguments[T], event: T) => void) {
    ipcRenderer.on(event, (_, args) => cb(args, event));
}

export function ipcSendMessage<T extends IpcAction>(action: T, data: IpcActionParams[T]) {
    const id = uuidv4();
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
        callbackHandlers[id] = resolve as unknown as (args: IpcActionReturn[IpcAction]) => void;
    });
}

type HandlerCallback = (arg: IpcActionReturn[IpcAction]) => void;

const handlers: {[T in IpcAction]: HandlerCallback[]} = {
    [IpcAction.LOAD_COMMITS]: [],
    [IpcAction.LOAD_BRANCHES]: [],
    [IpcAction.OPEN_REPO]: [],
    [IpcAction.LOAD_COMMIT]: [],
    [IpcAction.LOAD_PATCHES_WITHOUT_HUNKS]: [],
    [IpcAction.LOAD_HUNKS]: [],
    [IpcAction.CHECKOUT_BRANCH]: [],
    [IpcAction.REFRESH_WORKDIR]: [],
    [IpcAction.GET_CHANGES]: [],
    [IpcAction.STAGE_FILE]: [],
    [IpcAction.UNSTAGE_FILE]: [],
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
    [IpcAction.BLAME_FILE]: [],
    [IpcAction.REMOTES]: [],
    [IpcAction.RESOLVE_CONFLICT]: [],
    [IpcAction.EDIT_REMOTE]: [],
    [IpcAction.NEW_REMOTE]: [],
    [IpcAction.REMOVE_REMOTE]: [],
    [IpcAction.FETCH]: [],
    [IpcAction.SAVE_SETTINGS]: [],
    [IpcAction.GET_SETTINGS]: [],
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
function handleEvent<T extends IpcAction>(payload: {action: T, data: IpcActionReturn[T] | IpcActionReturnError}) {
    try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore, https://github.com/microsoft/TypeScript/issues/43210
        if ("error" in payload.data) {
            dialog.showErrorBox(`Error ${IpcAction[payload.action]}`, payload.data.error);
            // FIXME: can we define some sort of error handler here?
            console.warn(payload);
            return;
        }
        for (const handler of handlers[payload.action]) {
            handler(payload.data);
        }
    } catch (e) {
        console.error(e);
        console.log(payload, IpcAction[payload.action]);
        dialog.showErrorBox(`Error ${IpcAction[payload.action]}`, "Unknown error. Check devtools...");
    }
}
