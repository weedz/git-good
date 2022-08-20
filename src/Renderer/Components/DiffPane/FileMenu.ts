import { join } from "path";
import { getCurrentWindow, Menu, MenuItem, shell } from "@electron/remote";
import { h } from "preact";
import { openFileAtCommit, openFileHistory, Store } from "../../Data/store";
import { getContextMenuData, setContextMenuData } from "../../Data/ContextMenu";

const fileMenu = new Menu();
fileMenu.append(new MenuItem({
    label: "Open in default application",
    async click() {
        const path = `${Store.repo?.path}/${getContextMenuData().path}`;
        const error = await shell.openPath(path);
        if (error) {
            console.warn("Failed to open:", error);
        }
    }
}));
fileMenu.append(new MenuItem({
    label: "Show in folder",
    click() {
        if (Store.repo?.path) {
            const filepath = join(Store.repo.path, getContextMenuData().path);
            shell.showItemInFolder(filepath);
        }
    }
}));
fileMenu.append(new MenuItem({
    type: "separator"
}));
fileMenu.append(new MenuItem({
    label: "History",
    click() {
        openFileHistory(getContextMenuData().path, getContextMenuData().sha);
    }
}));
fileMenu.append(new MenuItem({
    label: "Open at commit",
    click() {
        openFileAtCommit(getContextMenuData().path, getContextMenuData().sha);
    }
}));
fileMenu.append(new MenuItem({
    type: "separator"
}));
fileMenu.append(new MenuItem({
    label: "Copy file path",
    click() {
        const path = `${Store.repo?.path}/${getContextMenuData().path}`;
        navigator.clipboard.writeText(path);
    }
}));

export function showFileMenu(e: h.JSX.TargetedMouseEvent<HTMLLIElement>, sha?: string) {
    e.preventDefault();
    const contextData = e.currentTarget.dataset as {[name: string]: string};
    if (sha) {
        contextData.sha = sha;
    }
    setContextMenuData(contextData)
    fileMenu.popup({
        window: getCurrentWindow()
    });
}
