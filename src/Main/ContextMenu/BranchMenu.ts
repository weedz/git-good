import { dialog, Menu, MenuItemConstructorOptions } from "electron/main";
import { Remote } from "nodegit";
import { IpcAction } from "../../Common/Actions";
import { BranchFromType, BranchType } from "../../Common/Branch";
import { signatureFromActiveProfile } from "../Config";
import { currentRepo, getContext } from "../Context";
import { sendAction } from "../IPC";
import * as provider from "../Provider";
import { sendEvent } from "../WindowEvents";

async function menuActionPullChanges(refName: string | null) {
    sendEvent("notification:pull-status", null);

    const result = await provider.pull(currentRepo(), refName, signatureFromActiveProfile());

    if (result) {
        sendEvent("notification:pull-status", {success: true});
    } else {
        sendEvent("notification:pull-status", {success: false});
    }
}

function setUpstreamMenuItem(ref: string, remote: string) {
    return {
        label: "Set upstream...",
        click() {
            const local = ref;
            sendEvent("dialog:set-upstream", {local, remote});
        }
    };
}

function createTag(ref: string) {
    return {
        label: "Create tag here...",
        click() {
            sendEvent("dialog:create-tag", {
                sha: ref,
                fromCommit: false
            });
        }
    };
}

function newBranch(ref: string) {
    return {
        label: "Create new branch...",
        click() {
            sendEvent("dialog:branch-from", {
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
                sendEvent("dialog:add-remote", null);
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
                sendEvent("dialog:edit-remote", {
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
                    provider.deleteRemoteRef(currentRepo(), refName);
                    sendEvent("notify", {
                        title: `Branch '${refName}' deleted from remote`
                    });
                    sendAction(IpcAction.REMOTES, await provider.remotes(currentRepo()));
                    sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(currentRepo()));
                }
            }
        },
        {
            type: "separator"
        },
        createTag(data.ref),
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
                sendEvent("dialog:rename-ref", {
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
                    await provider.deleteRef(currentRepo(), {name: refName});
                    sendEvent("notify", {
                        title: "Branch deleted",
                        body: `Branch '${refName}' deleted`
                    });
                    sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(currentRepo()));
                }
            }
        },
        { type: "separator" },
        createTag(data.ref),
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
                    sendEvent("dialog:push-tag", { name: data.ref });
                }
                sendEvent("notify", { title: "Pushing tag" });
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
                    sendEvent("notify", { title: `Deleting tag '${refName}'` });
                    await provider.deleteTag(currentRepo(), {name: refName, remote: result.checkboxChecked});
                    sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(currentRepo()));
                }
            }
        },
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
