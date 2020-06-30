import { ipcRenderer, IpcRendererEvent } from "electron";
import { IpcAction, IpcActionParams, IpcActionReturn } from "../Actions";

export const state = {
    repo: {},
    branches: {}
};

const handlers: {[key in IpcAction]: Function[]} = {
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
};
export function registerHandler<T extends IpcAction>(action: T, cb: (arg: IpcActionReturn[T]) => void) {
    handlers[action]?.push(cb);
}
export function unregisterHandler(action: IpcAction, cb: Function) {
    handlers[action].splice(handlers[action].indexOf(cb)>>>0, 1);
}

export function attach() {
    ipcRenderer.on("asynchronous-reply", handleEvent);
}
function handleEvent(event: IpcRendererEvent, payload: {action: IpcAction, data: any}) {
    if (!handlers[payload.action]) {
        console.warn(`Missing handler for action "${payload.action}"`);
        return;
    }
    for (const handler of handlers[payload.action]) {
        handler(payload.data);
    }
}
export function sendAsyncMessage<T extends IpcAction>(action: T, data?: IpcActionParams[T]) {
    ipcRenderer.send("asynchronous-message", {
        "action": action,
        data
    });
}
