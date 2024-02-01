import { clipboard } from "electron";
import { Menu, type MenuItemConstructorOptions } from "electron/main";
import { BranchFromType, HEAD_REF } from "../../Common/Branch.js";
import { AppEventType, LinkTypes } from "../../Common/WindowEventTypes.js";
import { currentRepo } from "../Context.js";
import { tryCompareRevisions } from "../Provider.js";
import { sendEvent } from "../WindowEvents.js";

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
                sendEvent(AppEventType.UNSELECT_LINK, LinkTypes.COMMITS);
                tryCompareRevisions(currentRepo(), {
                    from: data.sha,
                    to: HEAD_REF
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
