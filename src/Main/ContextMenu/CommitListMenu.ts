import { IpcMainInvokeEvent, Menu, MenuItem } from "electron/main";
import { BranchFromType } from "../../Common/Branch";
import { currentRepo } from "../Context";
import { tryCompareRevisions } from "../Provider";
import { sendEvent } from "../WindowEvents";

export function openCommitMenu(event: IpcMainInvokeEvent, data: Record<string, string>) {
    const commitMenu = new Menu();
    commitMenu.append(new MenuItem({
        label: "Branch...",
        click() {
            sendEvent("dialog:branch-from", {
                sha: data.sha,
                type: BranchFromType.COMMIT
            });
        }
    }));
    commitMenu.append(new MenuItem({
        label: "Diff...",
        click() {
            sendEvent("unselect-link", "commits");
            tryCompareRevisions(currentRepo(), {
                from: data.sha,
                to: "HEAD"
            });
        }
    }));
    commitMenu.append(new MenuItem({
        type: "separator"
    }));
    commitMenu.append(new MenuItem({
        label: "Create tag here...",
        click() {
            sendEvent("dialog:create-tag", {
                sha: data.sha,
                fromCommit: true,
            });
        }
    }));
    commitMenu.append(new MenuItem({
        type: "separator"
    }));
    commitMenu.append(new MenuItem({
        label: "Copy sha",
        click() {
            const sha = data.sha;
            navigator.clipboard.writeText(sha);
        }
    }));
    commitMenu.popup();
}
