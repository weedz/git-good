import { shell } from "electron";
import { IpcMainInvokeEvent, Menu, MenuItem } from "electron/main";
import { join } from "path";
import { IpcAction } from "../../Common/Actions";
import { currentRepo } from "../Context";
import { sendAction } from "../IPC";
import { getFileCommits, openFileAtCommit } from "../Provider";

export function openFileContextMenu(_event: IpcMainInvokeEvent, data: Record<string, string>) {
    const fileMenu = new Menu();
    fileMenu.append(new MenuItem({
        label: "Open in default application",
        async click() {
            const path = `${currentRepo().workdir()}/${data.path}`;
            const error = await shell.openPath(path);
            if (error) {
                console.warn("Failed to open:", error);
            }
        }
    }));
    fileMenu.append(new MenuItem({
        label: "Show in folder",
        click() {
            const filepath = join(currentRepo().workdir(), data.path);
            shell.showItemInFolder(filepath);
        }
    }));
    fileMenu.append(new MenuItem({
        type: "separator"
    }));
    fileMenu.append(new MenuItem({
        label: "History",
        async click() {
            const fileHistory = await getFileCommits(currentRepo(), {
                file: data.path,
                cursor: data.sha,
                startAtCursor: true,
            });
            sendAction(IpcAction.LOAD_FILE_COMMITS, fileHistory);
        }
    }));
    fileMenu.append(new MenuItem({
        label: "Open at commit",
        click() {
            openFileAtCommit(currentRepo(), {file: data.path, sha: data.sha});
        }
    }));
    fileMenu.append(new MenuItem({
        type: "separator"
    }));
    fileMenu.append(new MenuItem({
        label: "Copy Path",
        click() {
            const path = `${currentRepo().workdir()}/${data.path}`;
            navigator.clipboard.writeText(path);
        }
    }));
    fileMenu.append(new MenuItem({
        label: "Copy Relative Path",
        click() {
            const path = `${data.path}`;
            navigator.clipboard.writeText(path);
        }
    }));
    fileMenu.popup();
}
