import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import { IpcAction, IpcActionParams, IpcPayload } from "./Common/Actions";
import { ContextMenu, ContextMenuData } from "./Common/ContextMenu";
import { NativeDialog, NativeDialogData, NativeDialogReturn } from "./Common/Dialog";
import { RendererRequestData, RendererRequestEvents, RendererRequestPayload, WindowArguments, WindowEvents } from "./Common/WindowEventTypes";

export interface IContextMenuApi {
    openContextMenu: <M extends ContextMenu>(menu: M, data: ContextMenuData[M]) => void
    openNativeDialog: <D extends NativeDialog>(dialog: D, data: NativeDialogData[D]) => NativeDialogReturn[D]
    requestClientData: (callback: <E extends RendererRequestEvents>(payload: RendererRequestPayload<E>) => Promise<RendererRequestData[E]>) => void
    onAsyncReply: (callback: (payload: IpcPayload<IpcAction>) => void) => void
    onMainEvent: <T extends WindowEvents>(event: T, cb: (args: WindowArguments[T], event: T, rendererEvent?: IpcRendererEvent) => void) => void
    sendAsyncMessage: <T extends IpcAction>(action: T, data: IpcActionParams[T]) => number
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
        ipcRenderer.on("request-client-data", async (e, payload) => {
            const response = await callback(payload.data).catch(e => Error(e));
            ipcRenderer.send("response-client-data", {
                id: payload.id,
                data: response,
            });
        });
    },
    onAsyncReply: (callback: (payload: IpcPayload<IpcAction>) => void) => {
        ipcRenderer.on("asynchronous-reply", (event, payload) => callback(payload));
    },
    onMainEvent: <T extends WindowEvents>(event: T, cb: (args: WindowArguments[T], event: T, rendererEvent?: IpcRendererEvent) => void) => {
        ipcRenderer.on(event, (rendererEvent, args) => cb(args, event, rendererEvent));
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
});


export function addWindowEventListener<T extends WindowEvents>(event: T, cb: (args: WindowArguments[T], event: T, rendererEvent?: IpcRendererEvent) => void) {
    // TODO: Verify event type
    ipcRenderer.on(event, (rendererEvent, args) => cb(args, event, rendererEvent));
}
