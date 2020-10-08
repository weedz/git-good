import { IpcAction } from "../Actions";
import { sendAsyncMessage } from "./IPC";
import { closeDialogWindow, createBranchFromSha, createBranchFromRef, openDialogWindow, blameFile, setUpstream } from "./store";

export function openDialog_BlameFile() {
    openDialogWindow({
        title: "Blame file:",
        confirmCb: (data: any) => {
            if (data.branchName)
            {
                blameFile(data.branchName);
            }
            closeDialogWindow();
        },
        cancelCb: () => {
            closeDialogWindow();
        }
    });
}

export function openDialog_CompareRevisions() {
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

export function openDialog_BranchFrom(sha: string, type: BranchFromType) {
    openDialogWindow({
        title: "New branch",
        confirmCb(data: any) {
            if (data.branchName) {
                if (type === BranchFromType.COMMIT) {
                    createBranchFromSha(sha, data.branchName);
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

export function openDialog_SetUpstream(local: string) {
    openDialogWindow({
        title: "Set upstream",
        confirmCb(data: any) {
            setUpstream(local, data.branchName);
            closeDialogWindow();
        },
        cancelCb() {
            closeDialogWindow();
        }
    });
}
