import { ipcRenderer } from "electron";

export enum IPCAction {
    LOAD_COMMITS,
    LOAD_BRANCHES,
    OPEN_REPO
};

const handlers: {[key in IPCAction]?: Function} = {};
export function registerHandler(action: IPCAction, cb: Function) {
    handlers[action] = cb;
}
export function unregisterHandler(action: IPCAction) {
    delete handlers[action];
}

export function attach() {
    ipcRenderer.on("asynchronous-reply", handleEvent);
}
function handleEvent(event: any, payload: {action: IPCAction, data: any}) {
    handlers[payload.action] && handlers[payload.action]!(payload.data);
}
export function sendAsyncMessage(action: IPCAction, data?: any) {
    ipcRenderer.send("asynchronous-message", {
        "action": action,
        data
    });
}
