import { ipcMain } from "electron/main";
import type { AppEventData, RendererRequestArgs, RendererRequestData, RendererResponsePayload } from "../Common/WindowEventTypes";
import { AppEventType, RendererRequestEvents } from "../Common/WindowEventTypes";
import { currentWindow } from "./Context";

export function sendEvent<T extends AppEventType>(event: T, data: AppEventData[T]) {
    currentWindow().send("app-event", {event, data});
}

const callbackHandlers: Record<string, (args: RendererRequestData[RendererRequestEvents]) => void> = {};

ipcMain.on("response-client-data", (_, payload: RendererResponsePayload<RendererRequestEvents>) => {
    callbackHandlers[payload.id](payload.data);
    delete callbackHandlers[payload.id];
});

export async function requestClientData<T extends RendererRequestEvents>(event: T, args: RendererRequestArgs[T]) {
    const id = (Math.random() * Number.MAX_SAFE_INTEGER)>>>0;
    currentWindow().send("request-client-data", {
        id,
        event,
        data: args,
    });
    return new Promise<null | RendererRequestData[T]>(resolve => {
        // calbackHandlers get cleaned up in handler for "response-client-data"
        callbackHandlers[id] = resolve as unknown as (args: RendererRequestData[RendererRequestEvents]) => void;
    });
}
