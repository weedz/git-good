import { join } from "path";
import { getCurrentWindow, Menu, MenuItem, shell } from "@electron/remote";
import { h } from "preact";
import { contextMenuState, openFileHistory, Store } from "../../Data/store";

const fileMenu = new Menu();
fileMenu.append(new MenuItem({
    label: "Open in default application",
    async click() {
        const path = `${Store.repo?.path}/${contextMenuState.data.path}`;
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
            const filepath = join(Store.repo.path, contextMenuState.data.path);
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
        openFileHistory(contextMenuState.data.path, contextMenuState.data.sha);
    }
}));
fileMenu.append(new MenuItem({
    type: "separator"
}));
fileMenu.append(new MenuItem({
    label: "Copy file path",
    click() {
        const path = `${Store.repo?.path}/${contextMenuState.data.path}`;
        navigator.clipboard.writeText(path);
    }
}));

export function showFileMenu(e: h.JSX.TargetedMouseEvent<HTMLLIElement>, sha?: string) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget.dataset as {[name: string]: string};
    if (sha) {
        contextMenuState.data.sha = sha;
    }
    fileMenu.popup({
        window: getCurrentWindow()
    });
}
