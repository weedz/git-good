import { clipboard } from "electron";
import { Menu, MenuItemConstructorOptions } from "electron/main";
import { currentRepo } from "../Context";
import { openFileAtCommit } from "../Provider";
import { sendEvent } from "../WindowEvents";

export function openFileHistoryContextMenu(data: Record<string, string>) {
    const menuTemplate: MenuItemConstructorOptions[] = [
        {
            label: "View commit",
            click() {
                sendEvent("set-diffpane", data.sha);
            }
        },
        {
            label: "Open at commit",
            click() {
                openFileAtCommit(currentRepo(), {file: data.path, sha: data.sha});
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
