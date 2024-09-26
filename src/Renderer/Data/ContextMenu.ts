import { ContextMenu, type ContextMenuData } from "../../Common/ContextMenu.js";

export function openContextMenu<M extends ContextMenu>(menu: M, data: ContextMenuData[M]) {
    globalThis.electronAPI.openContextMenu(menu, data);
}
