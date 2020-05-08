import { ipcRenderer } from "electron";
import { IPCAction, IPCActionParams } from "./Actions";

const handlers: {[key in IPCAction]: Function[]} = {
    [IPCAction.LOAD_COMMITS]: [],
    [IPCAction.LOAD_BRANCHES]: [],
    [IPCAction.OPEN_REPO]: [],
    [IPCAction.LOAD_COMMIT]: [],
    [IPCAction.PATCH_WITHOUT_HUNKS]: [],
    [IPCAction.LOAD_HUNKS]: [],
};
export function registerHandler(action: IPCAction, cb: Function) {
    handlers[action]?.push(cb);
}
export function unregisterHandler(action: IPCAction, cb: Function) {
    handlers[action].splice(handlers[action].indexOf(cb)>>>0, 1);
}

export function attach() {
    ipcRenderer.on("asynchronous-reply", handleEvent);
}
function handleEvent(event: any, payload: {action: IPCAction, data: any}) {
    if (!handlers[payload.action]) {
        console.warn(`Missing handler for action "${payload.action}"`);
        return;
    }
    for (const handler of handlers[payload.action]) {
        handler(payload.data);
    }
}
export function sendAsyncMessage<T extends IPCAction>(action: T, data?: IPCActionParams[T]) {
    ipcRenderer.send("asynchronous-message", {
        "action": action,
        data
    });
}
