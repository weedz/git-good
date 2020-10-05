import { IpcAction } from "../../Actions";
import { sendAsyncMessage } from "../IPC";
import { closeDialogWindow, createBranch, createBranchFromRef, openDialogWindow } from "../store";

export function openDialogCompareRevisions() {
    openDialogWindow({
        title: "Compare revisions:",
        confirmCb: (data: any) => {
            if (data.branchName)
            {
                const [from,to] = data.branchName.split("..");
                if (from && to) {
                    sendAsyncMessage(IpcAction.OPEN_COMPARE_REVISIONS, {
                        from,
                        to
                    });
                }
            }
            closeDialogWindow();
        },
        cancelCb: () => {
            closeDialogWindow();
        }
    });
}

export enum BranchFromType {
    REF,
    COMMIT,
};

export function openDialogBranchFrom(sha: string, type: BranchFromType) {
    openDialogWindow({
        title: "New branch",
        confirmCb(data: any) {
            if (data.branchName) {
                if (type === BranchFromType.COMMIT) {
                    createBranch(sha, data.branchName);
                } else if (type === BranchFromType.REF) {
                    createBranchFromRef(sha, data.branchName);
                }
            }
            closeDialogWindow();
        },
        cancelCb() {
            closeDialogWindow();
        }
    });
}
