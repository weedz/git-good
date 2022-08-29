import { clipboard } from "electron";
import { Menu, MenuItemConstructorOptions } from "electron/main";
import { sendEvent } from "../WindowEvents";

export function openFileHistoryContextMenu(data: Record<string, string>) {
    const menuTemplate: MenuItemConstructorOptions[] = [
        {
            label: "View commit",
            click() {
                sendEvent("set-diffpane", data.sha);
            }
        },
        { type: "separator" },
        {
            label: "Copy sha",
            click() {
                const sha = data.sha;
                clipboard.writeText(sha);
            }
        },
    ];
    Menu.buildFromTemplate(menuTemplate).popup();
}
