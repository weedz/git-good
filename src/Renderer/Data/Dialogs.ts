import { IpcAction } from "../../Common/Actions";
import { BranchFromType, BranchType, getRemoteName, normalizeLocalName, normalizeRemoteNameWithoutRemote, normalizeTagName } from "../../Common/Branch";
import { DialogTypes, type DialogProps } from "../Components/Dialog/types";
import { ipcGetData, ipcSendMessage } from "./IPC";
import { Store, closeDialogWindow, createBranchFromRef, createBranchFromSha, openDialogWindow, renameLocalBranch, saveAppConfig, setUpstream } from "./store";

export function openDialog_EditRemote(dialogData: DialogProps[DialogTypes.EDIT_REMOTE]["data"]) {
    const oldName = dialogData.name;
    openDialogWindow(DialogTypes.EDIT_REMOTE, {
        data: dialogData,
        async confirmCb(data) {
            if (await ipcGetData(IpcAction.EDIT_REMOTE, {oldName, ...data})) {
                closeDialogWindow();
            }
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
            return null;
        }
    });
}

export function openDialog_SetUpstream(local: string, currentUpstream?: string) {
    let oldRemote = "";
    let branch = local;
    if (currentUpstream) {
        oldRemote = getRemoteName(currentUpstream);
        branch = normalizeRemoteNameWithoutRemote(currentUpstream);
    } else {
        oldRemote = Store.remotes[0].name,
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
    });
}

export function openDialog_Settings() {
    openDialogWindow(DialogTypes.SETTINGS, {
        confirmCb(appConfig) {
            saveAppConfig(appConfig);
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
    });
}

export function openDialog_PushTag(data: {name: string}) {
    openDialogWindow(DialogTypes.PUSH_TAG, {
        confirmCb(remote) {
            ipcSendMessage(IpcAction.PUSH, {
                remote,
                localBranch: data.name
            });
            closeDialogWindow();
        },
    });
}
