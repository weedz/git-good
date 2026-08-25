import { clipboard } from "electron";
import { Menu, type MenuItemConstructorOptions } from "electron/main";
import { AppEventType } from "../../Common/WindowEventTypes.js";
import { currentRepo } from "../Context.js";
import { openFileAtCommit } from "../Provider.js";
import { sendEvent } from "../WindowEvents.js";

export function openFileHistoryContextMenu(data: Record<string, string>) {
  const menuTemplate: MenuItemConstructorOptions[] = [
    {
      label: "View commit",
      click() {
        sendEvent(AppEventType.SET_DIFFPANE, data.sha);
      },
    },
    {
      label: "Open at commit",
      async click() {
        await openFileAtCommit(currentRepo(), { file: data.path, sha: data.sha });
      },
    },
    { type: "separator" },
    {
      label: "Copy sha",
      click() {
        const sha = data.sha;
        void clipboard.writeText(sha);
      },
    },
  ];
  Menu.buildFromTemplate(menuTemplate).popup();
}
