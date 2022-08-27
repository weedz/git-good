import { ipcRenderer } from "electron/renderer";
import { ContextMenu, ContextMenuData } from "../../Common/ContextMenu";

export function openContextMenu<M extends ContextMenu>(menu: M, data: ContextMenuData[M]) {
    ipcRenderer.send("context-menu", {
        action: menu,
        data,
    });
}
