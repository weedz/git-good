import { clipboard } from "electron";
import { dialog, Menu, MenuItemConstructorOptions } from "electron/main";
import { Remote } from "nodegit";
import { IpcAction } from "../../Common/Actions";
import { BranchFromType, BranchType } from "../../Common/Branch";
import { AppEventType } from "../../Common/WindowEventTypes";
import { signatureFromActiveProfile } from "../Config";
import { currentRepo, getContext } from "../Context";
import { sendAction } from "../IPC";
import * as provider from "../Provider";
import { sendEvent } from "../WindowEvents";

function menuActionPullChanges(refName: string | null) {
    return provider.pull(currentRepo(), refName, signatureFromActiveProfile());
}

function setUpstreamMenuItem(ref: string, remote: string) {
    return {
        label: "Set upstream...",
        click() {
            const local = ref;
            sendEvent(AppEventType.DIALOG_SET_UPSTREAM, {local, remote});
        }
    };
}

function createTag(ref: string) {
    return {
        label: "Create tag here...",
        click() {
            sendEvent(AppEventType.DIALOG_CREATE_TAG, {
                sha: ref,
                fromCommit: false
            });
        }
    };
}
function copyRefName(ref: string) {
    return {
        label: "Copy ref name",
        click() {
            clipboard.writeText(ref);
        }
    };
}

function newBranch(ref: string) {
    return {
        label: "Create new branch...",
        click() {
            sendEvent(AppEventType.DIALOG_BRANCH_FROM, {
                sha: ref,
                type: BranchFromType.REF
            });
        }
    };
}

export function openRemotesMenu(_: Record<string, string>) {
    const menuTemplate: MenuItemConstructorOptions[] = [
        {
            label: "Fetch all",
            async click() {
                const result = await provider.fetchFrom(currentRepo(), null);
                if (!result) {
                    dialog.showErrorBox("Failed to fetch remotes", "");
                }
            }
        },
        {
            type: "separator",
        },
        {
            label: "Add remote...",
            click() {
                sendEvent(AppEventType.DIALOG_ADD_REMOTE, null);
            }
        },
    ];
    Menu.buildFromTemplate(menuTemplate).popup();
}

export function openRemoteMenu(data: Record<string, string>) {
    const menuTemplate: MenuItemConstructorOptions[] = [
        {
            label: "Fetch",
            async click() {
                const result = await provider.fetchFrom(currentRepo(), {remote: data.remote});
                if (!result) {
                    dialog.showErrorBox("Failed to fetch remote", "");
                }
            }
        },
        {
            type: "separator"
        },
        {
            label: "Edit...",
            async click() {
                const remote = await currentRepo().getRemote(data.remote);
                if (!remote) {
                    dialog.showErrorBox("Error", `Could not find remote '${data.remote}'`);
                    return;
                }
                sendEvent(AppEventType.DIALOG_EDIT_REMOTE, {
                    name: remote.name(),
                    pushTo: remote.pushurl(),
                    pullFrom: remote.url(),
                });
            }
        },
        {
            label: "Remove",
            async click() {
                const remote = data.remote;
                const result = await dialog.showMessageBox({
                    message: `Delete remote ${remote}?`,
                    type: "question",
                    buttons: ["Cancel", "Delete"],
                    cancelId: 0,
                });
                if (result.response === 1) {
                    try {
                        await Remote.delete(currentRepo(), remote);
                        sendAction(IpcAction.REMOTES, await provider.remotes(currentRepo()));
                        sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(currentRepo()));
                    } catch (err) {
                        return err as Error;
                    }
                }
    
                return true;
            }
        },
    ];
    Menu.buildFromTemplate(menuTemplate).popup();
}

export function openRemoteRefMenu(data: Record<string, string>) {
    const menuTemplate: MenuItemConstructorOptions[] = [
        newBranch(data.ref),
        {
            label: "Delete",
            async click() {
                const refName = data.ref;
                const result = await dialog.showMessageBox({
                    message: `Delete branch ${refName}?`,
                    type: "question",
                    buttons: ["Cancel", "Delete"],
                    cancelId: 0,
                });
    
                if (result.response === 1) {
                    await provider.deleteRemoteRef(currentRepo(), refName);
                    sendEvent(AppEventType.NOTIFY, {
                        title: `Branch '${refName}' deleted from remote`
                    });
                    sendAction(IpcAction.REMOTES, await provider.remotes(currentRepo()));
                    sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(currentRepo()));
                }
            }
        },
        { type: "separator" },
        createTag(data.ref),
        { type: "separator" },
        copyRefName(data.ref),
    ];
    Menu.buildFromTemplate(menuTemplate).popup();
}

export function openLocalMenu(data: Record<string, string>) {
    const menuTemplate: MenuItemConstructorOptions[] = [
        {
            label: "Checkout",
            async click() {
                sendAction(IpcAction.CHECKOUT_BRANCH, await provider.checkoutBranch(currentRepo(), data.ref));
            }
        },
        {
            label: "Pull",
            async click() {
                await menuActionPullChanges(data.ref);
                sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(currentRepo()));
            }
        },
        setUpstreamMenuItem(data.ref, data.remote),
        { type: "separator" },
        newBranch(data.ref),
        {
            label: "Rename...",
            click() {
                sendEvent(AppEventType.DIALOG_RENAME_REF, {
                    name: data.ref,
                    type: BranchType.LOCAL
                });
            }
        },
        {
            label: "Delete",
            async click() {
                const refName = data.ref;
                // TODO: Specifik dialog for this?
                const result = await dialog.showMessageBox({
                    message: `Delete branch ${refName}?`,
                    type: "question",
                    buttons: ["Cancel", "Delete"],
                    cancelId: 0,
                });
                if (result.response === 1) {
                    await provider.deleteRef(currentRepo(), refName);
                    sendEvent(AppEventType.NOTIFY, {
                        title: "Branch deleted",
                        body: `Branch '${refName}' deleted`
                    });
                    sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(currentRepo()));
                }
            }
        },
        { type: "separator" },
        createTag(data.ref),
        { type: "separator" },
        copyRefName(data.ref),
    ];
    Menu.buildFromTemplate(menuTemplate).popup();
}

export function openHeadMenu(data: Record<string, string>) {
    const menuTemplate: MenuItemConstructorOptions[] = [
        {
            label: "Pull",
            async click() {
                await menuActionPullChanges(null);
                sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(currentRepo()));
            }
        },
        {
            label: "Push",
            async click() {
                await provider.push(getContext(), null);
                sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(currentRepo()));
            }
        },
        setUpstreamMenuItem(data.ref, data.remote),
        { type: "separator" },
        newBranch(data.ref),
        { type: "separator" },
        createTag(data.ref),
        { type: "separator" },
        copyRefName(data.ref),
    ];
    Menu.buildFromTemplate(menuTemplate).popup();
}

export function openTagMenu(data: Record<string, string>) {
    const menuTemplate: MenuItemConstructorOptions[] = [
        newBranch(data.ref),
        {
            label: "Push to remote...",
            async click() {
                const remotes = await currentRepo().getRemoteNames();
                if (remotes.length > 1) {
                    sendEvent(AppEventType.DIALOG_PUSH_TAG, { name: data.ref });
                }
                sendEvent(AppEventType.NOTIFY, { title: "Pushing tag" });
                await provider.push(getContext(), {
                    remote: remotes[0],
                    localBranch: data.ref
                });
                sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(currentRepo()));
            }
        },
        { type: "separator" },
        {
            label: "Delete",
            async click() {
                const refName = data.ref;
                // TODO: Specifik dialog for this?
                const result = await dialog.showMessageBox({
                    message: `Delete tag ${refName}?`,
                    type: "question",
                    buttons: ["Cancel", "Delete"],
                    cancelId: 0,
                    checkboxLabel: "Delete from remote?",
                });
                if (result.response === 1) {
                    sendEvent(AppEventType.NOTIFY, { title: `Deleting tag '${refName}'` });
                    await provider.deleteTag(currentRepo(), {name: refName, remote: result.checkboxChecked});
                    sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(currentRepo()));
                }
            }
        },
        { type: "separator" },
        copyRefName(data.ref),
    ];
    Menu.buildFromTemplate(menuTemplate).popup();
}

export function openStashMenu(data: Record<string, string>) {
    const menuTemplate: MenuItemConstructorOptions[] = [
        {
            label: "Apply",
            click() {
                provider.stashApply(currentRepo(), Number.parseInt(data.index, 10));
            }
        },
        {
            label: "Pop",
            click() {
                provider.stashPop(currentRepo(), Number.parseInt(data.index, 10));
            }
        },
        {
            label: "Drop",
            click() {
                provider.stashDrop(currentRepo(), Number.parseInt(data.index, 10));
            }
        },
    ];
    Menu.buildFromTemplate(menuTemplate).popup();
}
