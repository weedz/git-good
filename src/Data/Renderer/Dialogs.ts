import { DialogTypes } from "src/Components/Dialog/types";
import { IpcAction } from "../Actions";
import { normalizeLocalName, normalizeRemoteNameWithoutOrigin, normalizeTagName } from "../Branch";
import { sendAsyncMessage } from "./IPC";
import { closeDialogWindow, createBranchFromSha, createBranchFromRef, openDialogWindow, blameFile, setUpstream, renameLocalBranch } from "./store";

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
    let defaultValue;
    if (sha.startsWith("refs/")) {
        if (sha.startsWith("refs/heads/")) {
            defaultValue = normalizeLocalName(sha);
        } else if (sha.startsWith("refs/remotes/")) {
            defaultValue = normalizeRemoteNameWithoutOrigin(sha);
        } else if (sha.startsWith("refs/tags")) {
            defaultValue = normalizeTagName(sha);
        }
    }
    openDialogWindow(DialogTypes.NEW_BRANCH, {
        defaultValue,
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

export enum BranchType {
    LOCAL,
    REMOTE
}

export function openDialog_RenameRef(sha: string, type: BranchType) {
    let currentName;
    if (sha.startsWith("refs/")) {
        if (sha.startsWith("refs/heads/")) {
            currentName = normalizeLocalName(sha);
        } else if (sha.startsWith("refs/remotes/")) {
            currentName = normalizeRemoteNameWithoutOrigin(sha);
        } else if (sha.startsWith("refs/tags")) {
            currentName = normalizeTagName(sha);
        }
    }
    openDialogWindow(DialogTypes.RENAME_BRANCH, {
        defaultValue: currentName,
        cancelCb() {
            closeDialogWindow();
        },
        confirmCb(newName) {
            closeDialogWindow();
            if (newName) {
                switch (type) {
                    case BranchType.LOCAL:
                        return renameLocalBranch(sha, newName);
                    case BranchType.REMOTE:
                        console.log("FIXME: rename remote refs");
                        // return renameRemoteBranch(sha, newName);
                }
            }
        }
    });
}

export function openDialog_SetUpstream(local: string, currentUpstream?: string) {
    openDialogWindow(DialogTypes.SET_UPSTREAM, {
        confirmCb(remote, upstream) {
            closeDialogWindow();
            setUpstream(local, upstream ? `${remote}/${upstream}` : null);
        },
        cancelCb() {
            closeDialogWindow();
        },
        default: {
            remote: "origin",
            branch: currentUpstream || normalizeLocalName(local),
        }
    });
}
