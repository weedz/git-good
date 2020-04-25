import { ipcRenderer } from "electron";

export enum IPCAction {
    LOAD_COMMITS,
    LOAD_BRANCHES,
    OPEN_REPO,
    LOAD_COMMIT,
};

const handlers: {[key in IPCAction]: Function[]} = {
    [IPCAction.LOAD_COMMITS]: [],
    [IPCAction.LOAD_BRANCHES]: [],
    [IPCAction.OPEN_REPO]: [],
    [IPCAction.LOAD_COMMIT]: [],
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
    for (const handler of handlers[payload.action]) {
        handler(payload.data);
    }
}
export function sendAsyncMessage(action: IPCAction, data?: any) {
    ipcRenderer.send("asynchronous-message", {
        "action": action,
        data
    });
}
