import { clipboard } from "electron";
import { Menu, MenuItemConstructorOptions } from "electron/main";
import { BranchFromType } from "../../Common/Branch";
import { AppEventType } from "../../Common/WindowEventTypes";
import { currentRepo } from "../Context";
import { tryCompareRevisions } from "../Provider";
import { sendEvent } from "../WindowEvents";

export function openCommitMenu(data: Record<string, string>) {
    const menuTemplate: MenuItemConstructorOptions[] = [
        {
            label: "Branch...",
            click() {
                sendEvent(AppEventType.DIALOG_BRANCH_FROM, {
                    sha: data.sha,
                    type: BranchFromType.COMMIT
                });
            }
        },
        {
            label: "Diff...",
            click() {
                sendEvent(AppEventType.UNSELECT_LINK, "commits");
                tryCompareRevisions(currentRepo(), {
                    from: data.sha,
                    to: "HEAD"
                });
            }
        },
        { type: "separator" },
        {
            label: "Create tag here...",
            click() {
                sendEvent(AppEventType.DIALOG_CREATE_TAG, {
                    sha: data.sha,
                    fromCommit: true,
                });
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
