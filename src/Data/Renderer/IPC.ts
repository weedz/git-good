import { ipcRenderer, remote } from "electron";
import { IpcRendererEvent } from "electron/main";
import { IpcAction, IpcActionParams, IpcActionReturn } from "../Actions";
import { WindowArguments, WindowEvents } from "../WindowEventTypes";

function attach() {
    ipcRenderer.on("asynchronous-reply", handleEvent);
}
attach();

export function addWindowEventListener<T extends WindowEvents>(event: T, cb: (args: WindowArguments[T], event: T) => void) {
    ipcRenderer.on(event, (_, args) => cb(args, event));
}

export function sendAsyncMessage<T extends IpcAction>(action: T, data: IpcActionParams[T] | void) {
    ipcRenderer.send("asynchronous-message", {
        "action": action,
        data
    });
}

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
    [IpcAction.SET_UPSTREAM]: [],
    [IpcAction.CREATE_BRANCH]: [],
    [IpcAction.CREATE_BRANCH_FROM_REF]: [],
    [IpcAction.DELETE_REF]: [],
    [IpcAction.DELETE_REMOTE_REF]: [],
    [IpcAction.FIND_FILE]: [],
    [IpcAction.ABORT_REBASE]: [],
    [IpcAction.CONTINUE_REBASE]: [],
    [IpcAction.OPEN_COMPARE_REVISIONS]: [],
    [IpcAction.BLAME_FILE]: [],
    [IpcAction.REMOTES]: [],
};
export function registerHandler<T extends IpcAction>(action: T, cb: (arg: IpcActionReturn[T]) => void) {
    handlers[action].push(cb);
}
export function unregisterHandler(action: IpcAction, cb: Function) {
    handlers[action].splice(handlers[action].indexOf(cb)>>>0, 1);
}
function handleEvent(_: IpcRendererEvent, payload: {action: IpcAction, data: any}) {
    if (payload.data.error) {
        remote.dialog.showErrorBox(`Error ${IpcAction[payload.action]}`, payload.data.error);
    }
    if (!handlers[payload.action]) {
        console.warn(`Missing handler for action "${payload.action}"`);
        return;
    }
    for (const handler of handlers[payload.action]) {
        handler(payload.data);
    }
}
