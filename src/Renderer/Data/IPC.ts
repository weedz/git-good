import { IpcAction, IpcActionParams, IpcActionReturn, IpcPayload, IpcResponse } from "../../Common/Actions";
import { AppEventData, AppEventType } from "../../Common/WindowEventTypes";
import { NativeDialog, NativeDialogData } from "../../Common/Dialog";

window.electronAPI.onAsyncReply(handleMessage);
window.electronAPI.onAppEvent(handleAppEvent);

export async function openNativeDialog<D extends NativeDialog>(dialog: D, data: NativeDialogData[D]) {
    return window.electronAPI.openNativeDialog(dialog, data);
}

// We send null to callbacks when the action failed/returned an error
const callbackHandlers: Map<number, (args: IpcActionReturn[IpcAction] | null) => void> = new Map();

function handleMessage(payload: IpcPayload<IpcAction>) {
    if (payload.id) {
        const handler = callbackHandlers.get(payload.id);
        if (handler) {
            callbackHandlers.delete(payload.id);
            if ("error" in payload) {
                handler(null);
            } else {
                handler(payload.data);
            }
        }
    }
    handleEvent(payload);
}

type AppEventHandlerCallback<T extends AppEventType> = (args: AppEventData[T]) => void;
let appEventHandlers: {
    [T in AppEventType]: AppEventHandlerCallback<T>
};
export function registerAppEventHandlers(handlers: typeof appEventHandlers) {
    appEventHandlers = handlers;
}

function handleAppEvent<T extends AppEventType>(payload: {
    event: T
    data: AppEventData[T]
}) {
    appEventHandlers[payload.event](payload.data);
}

export function ipcSendMessage<T extends IpcAction>(action: T, data: IpcActionParams[T]) {
    return window.electronAPI.sendAsyncMessage(action, data);
}

export function ipcGetData<T extends IpcAction>(action: T, data: IpcActionParams[T]) {
    const id = ipcSendMessage(action, data);
    return new Promise<IpcActionReturn[T]>((resolve, _reject) => {
        // calbackHandlers get cleaned up in handleMessage()
        callbackHandlers.set(id, resolve as unknown as (args: IpcActionReturn[IpcAction] | null) => void);
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
    [IpcAction.LOAD_COMMIT]: [],
    [IpcAction.LOAD_PATCHES_WITHOUT_HUNKS]: [],
    [IpcAction.LOAD_HUNKS]: [],
    [IpcAction.SHOW_STASH]: [],
    [IpcAction.CHECKOUT_BRANCH]: [],
    [IpcAction.GET_CHANGES]: [],
    [IpcAction.STAGE_FILE]: [],
    [IpcAction.UNSTAGE_FILE]: [],
    [IpcAction.STAGE_ALL]: [],
    [IpcAction.UNSTAGE_ALL]: [],
    [IpcAction.COMMIT]: [],
    [IpcAction.PUSH]: [],
    [IpcAction.SET_UPSTREAM]: [],
    [IpcAction.CREATE_BRANCH]: [],
    [IpcAction.CREATE_BRANCH_FROM_REF]: [],
    [IpcAction.RENAME_LOCAL_BRANCH]: [],
    [IpcAction.FIND_FILE]: [],
    [IpcAction.OPEN_COMPARE_REVISIONS]: [],
    [IpcAction.REMOTES]: [],
    [IpcAction.RESOLVE_CONFLICT]: [],
    [IpcAction.EDIT_REMOTE]: [],
    [IpcAction.NEW_REMOTE]: [],
    [IpcAction.FETCH]: [],
    [IpcAction.SAVE_SETTINGS]: [],
    [IpcAction.GET_SETTINGS]: [],
    [IpcAction.REPO_PROFILE]: [],
    [IpcAction.FILE_DIFF_AT]: [],
    [IpcAction.CREATE_TAG]: [],
    [IpcAction.PARSE_REVSPEC]: [],
    [IpcAction.LOAD_STASHES]: [],
    [IpcAction.GET_COMMIT_GPG_SIGN]: [],
    [IpcAction.LOAD_TREE_AT_COMMIT]: [],
    [IpcAction.CONTINUE_REBASE]: [],
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
        let data: IpcResponse<T>;
        if ("error" in payload) {
            openNativeDialog(NativeDialog.ERROR, {title: `Error ${payload.action}`, content: payload.error})
            console.warn(payload);
            data = Error();
        } else {
            data = payload.data;
        }
        for (const handler of handlers[payload.action]) {
            handler(data);
        }
    } catch (e) {
        console.error(e);
        console.log(payload);
        openNativeDialog(NativeDialog.ERROR, {title: `Error ${payload.action}`, content: "Unknown error. Check devtools..."})
    }
}
