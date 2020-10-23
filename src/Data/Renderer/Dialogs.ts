import { DialogTypes } from "src/Components/Dialog/types";
import { IpcAction } from "../Actions";
import { normalizeLocalName } from "../Branch";
import { sendAsyncMessage } from "./IPC";
import { closeDialogWindow, createBranchFromSha, createBranchFromRef, openDialogWindow, blameFile, setUpstream } from "./store";

export function openDialog_BlameFile() {
    openDialogWindow(DialogTypes.BLAME, {
        confirmCb(file) {
            closeDialogWindow();
            if (file)
            {
                blameFile(file);
            }
        },
        cancelCb() {
            closeDialogWindow();
        },
    });
}

export function openDialog_CompareRevisions() {
    openDialogWindow(DialogTypes.COMPARE, {
        confirmCb(from, to) {
            closeDialogWindow();
            if (from && to)
            {
                sendAsyncMessage(IpcAction.OPEN_COMPARE_REVISIONS, {
                    from,
                    to
                });
            }
        },
        cancelCb() {
            closeDialogWindow();
        },
    });
}

export enum BranchFromType {
    REF,
    COMMIT,
}

export function openDialog_BranchFrom(sha: string, type: BranchFromType) {
    openDialogWindow(DialogTypes.NEW_BRANCH, {
        cancelCb() {
            closeDialogWindow();
        },
        confirmCb(branchName) {
            closeDialogWindow();
            if (branchName) {
                if (type === BranchFromType.COMMIT) {
                    createBranchFromSha(sha, branchName);
                } else if (type === BranchFromType.REF) {
                    createBranchFromRef(sha, branchName);
                }
            }
        }
    });
}

export function openDialog_SetUpstream(local: string) {
    openDialogWindow(DialogTypes.SET_UPSTREAM, {
        confirmCb(remote, upstream) {
            closeDialogWindow();
            setUpstream(local, `${remote}/${upstream}`);
        },
        cancelCb() {
            closeDialogWindow();
        },
        default: {
            remote: "origin",
            branch: normalizeLocalName(local),
        }
    });
}
