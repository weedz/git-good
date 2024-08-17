import { clipboard, shell } from "electron";
import { Menu, type MenuItemConstructorOptions } from "electron/main";
import { join } from "path";
import { IpcAction } from "../../Common/Actions.js";
import { currentRepo } from "../Context.js";
import { sendAction } from "../IPC.js";
import { getFileCommits, openFileAtCommit } from "../Provider.js";

export function openFileContextMenu(data: Record<string, string>) {
    const menuTemplate: MenuItemConstructorOptions[] = [
        {
            label: "Open in default application",
            async click() {
                const path = `${currentRepo().workdir()}/${data.path}`;
                const error = await shell.openPath(path);
                if (error) {
                    console.warn("Failed to open:", error);
                }
            },
        },
        {
            label: "Show in folder",
            click() {
                const filepath = join(currentRepo().workdir(), data.path);
                shell.showItemInFolder(filepath);
            },
        },
        { type: "separator" },
        {
            label: "History",
            async click() {
                const fileHistory = await getFileCommits(currentRepo(), {
                    file: data.path,
                    cursor: data.sha,
                    startAtCursor: true,
                });
                sendAction(IpcAction.LOAD_FILE_COMMITS, fileHistory);
            },
        },
        {
            label: "Open at commit",
            click() {
                openFileAtCommit(currentRepo(), { file: data.path, sha: data.sha });
            },
        },
        { type: "separator" },
        {
            label: "Copy Path",
            click() {
                const path = `${currentRepo().workdir()}/${data.path}`;
                clipboard.writeText(path);
            },
        },
        {
            label: "Copy Relative Path",
            click() {
                const path = `${data.path}`;
                clipboard.writeText(path);
            },
        },
    ];
    Menu.buildFromTemplate(menuTemplate).popup();
}
