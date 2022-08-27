import { ipcRenderer } from "electron/renderer";
import { DialogProps, DialogTypes } from "../Components/Dialog/types";
import { IpcAction } from "../../Common/Actions";
import { BranchFromType, BranchType, normalizeLocalName, normalizeRemoteNameWithoutRemote, normalizeTagName, remoteName } from "../../Common/Branch";
import { ipcGetData, ipcSendMessage } from "./IPC";
import { closeDialogWindow, createBranchFromSha, createBranchFromRef, openDialogWindow, setUpstream, renameLocalBranch, setDiffpaneSrc } from "./store";
import { NativeDialog, NativeDialogData } from "../../Common/Dialog";

export async function openNativeDialog<D extends NativeDialog>(dialog: D, data: NativeDialogData[D]) {
    return ipcRenderer.invoke("dialog", {
        action: dialog,
        data,
    });
}

export function openDialog_EditRemote(data: DialogProps[DialogTypes.EDIT_REMOTE]["data"]) {
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

export function openDialog_ViewCommit() {
    openDialogWindow(DialogTypes.VIEW_COMMIT, {
        async confirmCb(sha) {
            closeDialogWindow();
            if (sha) {
                try {
                    sha = await ipcGetData(IpcAction.PARSE_REVSPEC, sha);
                    setDiffpaneSrc(sha);
                } catch (e) {
                    // Invalid revspec
                }
            }
        },
        cancelCb() {
            closeDialogWindow();
        },
    });
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
        data: defaultValue,
        cancelCb() {
            closeDialogWindow();
        },
        async confirmCb(branchName, checkout) {
            let success = true;
            if (branchName) {
                if (type === BranchFromType.COMMIT) {
                    success = await createBranchFromSha(sha, branchName, checkout);
                } else if (type === BranchFromType.REF) {
                    success = await createBranchFromRef(sha, branchName, checkout);
                }
            }
            if (success) {
                closeDialogWindow();
            }
        }
    });
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
        data: currentName,
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
        data: {
            remote: oldRemote,
            branch,
        },
        async confirmCb(remote, upstream) {
            if (await setUpstream(local, upstream ? `${remote}/${upstream}` : null)) {
                closeDialogWindow();
            }
        },
        cancelCb() {
            closeDialogWindow();
        },
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

export function openDialog_createTag(from: string, fromCommit = false) {
    openDialogWindow(DialogTypes.CREATE_TAG, {
        confirmCb(tag) {
            ipcSendMessage(IpcAction.CREATE_TAG, {
                from,
                fromCommit,
                ...tag
            });
            closeDialogWindow();
        },
        cancelCb() {
            closeDialogWindow();
        }
    })
}

export function openDialog_PushTag(tagName: string) {
    openDialogWindow(DialogTypes.PUSH_TAG, {
        confirmCb(remote) {
            ipcSendMessage(IpcAction.PUSH, {
                remote,
                localBranch: tagName
            });
            closeDialogWindow();
        },
        cancelCb() {
            closeDialogWindow();
        }
    })
}
