import { getCurrentWindow, Menu, MenuItem, clipboard } from "@electron/remote";
import { h } from "preact";
import { getContextMenuData, setContextMenuData } from "../../Data/ContextMenu";
import { setDiffpaneSrc } from "../../Data/store";

const commitMenu = new Menu();
commitMenu.append(new MenuItem({
    label: "View commit",
    click() {
        const sha = getContextMenuData().sha;
        setDiffpaneSrc(sha);
    }
}));
commitMenu.append(new MenuItem({
    type: "separator"
}));
commitMenu.append(new MenuItem({
    label: "Copy sha",
    click() {
        const sha = getContextMenuData().sha;
        clipboard.writeText(sha);
    }
}));

export function showFileHistoryCommitMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    setContextMenuData(e.currentTarget.dataset as {[name: string]: string});
    commitMenu.popup({
        window: getCurrentWindow()
    });
}
