import { getCurrentWindow, Menu, MenuItem } from "@electron/remote";
import { clipboard } from "electron";
import { h } from "preact";
import { contextMenuState, setDiffpaneSrc } from "../../Data/Renderer/store";

const commitMenu = new Menu();
commitMenu.append(new MenuItem({
    label: "View commit",
    click() {
        const sha = contextMenuState.data.sha;
        setDiffpaneSrc(sha);
    }
}));
commitMenu.append(new MenuItem({
    type: "separator"
}));
commitMenu.append(new MenuItem({
    label: 'Copy sha',
    click() {
        const sha = contextMenuState.data.sha;
        clipboard.writeText(sha);
    }
}));

export function showFileHistoryCommitMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget.dataset as {[name: string]: string};
    commitMenu.popup({
        window: getCurrentWindow()
    });
}
