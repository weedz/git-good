import { DialogTypes } from "src/Components/Dialog/types";
import { IpcAction } from "../Actions";
import { normalizeLocalName, normalizeRemoteNameWithoutRemote, normalizeTagName, remoteName } from "../Branch";
import { ipcGetData, ipcSendMessage } from "./IPC";
import { closeDialogWindow, createBranchFromSha, createBranchFromRef, openDialogWindow, setUpstream, renameLocalBranch } from "./store";

export function openDialog_EditRemote(data: {name: string, pullFrom: string, pushTo?: string}) {
    const oldName = data.name;
    openDialogWindow(DialogTypes.EDIT_REMOTE, {
        data,
        async confirmCb(data) {
            if (await ipcGetData(IpcAction.EDIT_REMOTE, {oldName, ...data})) {
                closeDialogWindow();
            }
        },
        cancelCb() {
            closeDialogWindow();
        },
    });
}

export function openDialog_AddRemote() {
    openDialogWindow(DialogTypes.ADD_REMOTE, {
        async confirmCb(data) {
            if (await ipcGetData(IpcAction.NEW_REMOTE, data)) {
                closeDialogWindow();
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
            if (from && to) {
                ipcSendMessage(IpcAction.OPEN_COMPARE_REVISIONS, {
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
            defaultValue = normalizeRemoteNameWithoutRemote(sha);
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
            currentName = normalizeRemoteNameWithoutRemote(sha);
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
    let oldRemote = "origin";
    let branch = local;
    if (currentUpstream) {
        oldRemote = remoteName(currentUpstream);
        branch = normalizeRemoteNameWithoutRemote(currentUpstream);
    } else {
        branch = normalizeLocalName(branch);
    }

    openDialogWindow(DialogTypes.SET_UPSTREAM, {
        async confirmCb(remote, upstream) {
            if (await setUpstream(local, upstream ? `${remote}/${upstream}` : null)) {
                closeDialogWindow();
            }
        },
        cancelCb() {
            closeDialogWindow();
        },
        default: {
            remote: oldRemote,
            branch,
        }
    });
}

export function openDialog_Settings() {
    openDialogWindow(DialogTypes.SETTINGS, {
        confirmCb(settings) {
            ipcSendMessage(IpcAction.SAVE_SETTINGS, settings);
        },
        cancelCb() {
            closeDialogWindow();
        },
    });
}
