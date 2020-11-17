import { remote, shell } from "electron";
import { h } from "preact";
import { blameFile, contextMenuState, Store } from "src/Data/Renderer/store";

const { Menu, MenuItem } = remote;

const fileMenu = new Menu();
fileMenu.append(new MenuItem({
    label: "Open in default application",
    click() {
        const path = `${Store.repo?.path}/${contextMenuState.data.path}`;
        shell.openPath(path);
    }
}));
fileMenu.append(new MenuItem({
    label: "Show in folder",
    click() {
        const path = `${Store.repo?.path}/${contextMenuState.data.path}`;
        shell.showItemInFolder(path);
    }
}));
fileMenu.append(new MenuItem({
    type: "separator"
}));
fileMenu.append(new MenuItem({
    label: "Blame",
    click() {
        console.log(`Blame ${contextMenuState.data.path}`);
        blameFile(contextMenuState.data.path);
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

export function showFileMenu(e: h.JSX.TargetedMouseEvent<HTMLLIElement>) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget.dataset as {[name: string]: string};
    fileMenu.popup({
        window: remote.getCurrentWindow()
    });
}
