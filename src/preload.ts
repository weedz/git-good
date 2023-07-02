import { contextBridge, ipcRenderer } from "electron/renderer";
import type { IpcAction, IpcActionParams, IpcPayload } from "./Common/Actions";
import { ContextMenu, type ContextMenuData } from "./Common/ContextMenu";
import { NativeDialog, type NativeDialogData, type NativeDialogReturn } from "./Common/Dialog";
import { type AppEventData, AppEventType, type RendererRequestData, RendererRequestEvents, type RendererRequestPayload } from "./Common/WindowEventTypes";

interface IContextMenuApi {
    openContextMenu: <M extends ContextMenu>(menu: M, data: ContextMenuData[M]) => void
    openNativeDialog: <D extends NativeDialog>(dialog: D, data: NativeDialogData[D]) => NativeDialogReturn[D]
    requestClientData: (callback: <E extends RendererRequestEvents>(payload: RendererRequestPayload<E>) => Promise<null | RendererRequestData[E]>) => void
    onAsyncReply: (callback: (payload: IpcPayload<IpcAction>) => void) => void
    sendAsyncMessage: <T extends IpcAction>(action: T, data: IpcActionParams[T]) => number
    onAppEvent: <T extends AppEventType>(callback: (payload: {data: AppEventData[T], event: T}) => void) => void
}

declare global {
    interface Window {
        electronAPI: IContextMenuApi
    }
}

contextBridge.exposeInMainWorld("versions", {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  // we can also expose variables, not just functions
})

contextBridge.exposeInMainWorld("electronAPI", {
    openContextMenu: <M extends ContextMenu>(menu: M, data: ContextMenuData[M]) => {
        ipcRenderer.send("context-menu", {
            action: menu,
            data,
        });
    },
    openNativeDialog: <D extends NativeDialog>(dialog: D, data: NativeDialogData[D]) => {
        return ipcRenderer.invoke("dialog", {
            action: dialog,
            data,
        });
    },
    requestClientData: (callback: <E extends RendererRequestEvents>(payload: RendererRequestPayload<E>) => Promise<RendererRequestData[E]>) => {
        ipcRenderer.on("request-client-data", async (_, payload) => {
            const response = await callback(payload).catch(e => Error(e));
            ipcRenderer.send("response-client-data", {
                id: payload.id,
                data: response,
            });
        });
    },
    onAsyncReply: (callback: (payload: IpcPayload<IpcAction>) => void) => {
        ipcRenderer.on("asynchronous-reply", (_, payload) => callback(payload));
    },
    sendAsyncMessage: <T extends IpcAction>(action: T, data: IpcActionParams[T]) => {
        const id = (Math.random() * Number.MAX_SAFE_INTEGER)>>>0;
        ipcRenderer.send("asynchronous-message", {
            action,
            data,
            id,
        });
        return id
    },
    onAppEvent: <T extends AppEventType>(callback: (payload: {data: AppEventData[T], event: T}) => void) => {
        ipcRenderer.on("app-event", (_rendererEvent, args) => callback(args));
    },
});
