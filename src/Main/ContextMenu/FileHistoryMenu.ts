import { IpcMainInvokeEvent, Menu, MenuItem } from "electron/main";
import { sendEvent } from "../WindowEvents";

export function openFileHistoryContextMenu(_event: IpcMainInvokeEvent, data: Record<string, string>) {
    const fileHistoryMenu = new Menu();
    fileHistoryMenu.append(new MenuItem({
        label: "View commit",
        click() {
            sendEvent("set-diffpane", data.sha);
        }
    }));
    fileHistoryMenu.append(new MenuItem({
        type: "separator"
    }));
    fileHistoryMenu.append(new MenuItem({
        label: "Copy sha",
        click() {
            const sha = data.sha;
            navigator.clipboard.writeText(sha);
        }
    }));
    fileHistoryMenu.popup();
}
