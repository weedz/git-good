import { ContextMenu, type ContextMenuData } from "../../Common/ContextMenu.js";

export function openContextMenu<M extends ContextMenu>(menu: M, data: ContextMenuData[M]) {
    window.electronAPI.openContextMenu(menu, data);
}
