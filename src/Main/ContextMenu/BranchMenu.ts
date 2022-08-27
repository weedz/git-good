import { dialog, IpcMainInvokeEvent, Menu, MenuItem } from "electron/main";
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

const setUpstreamMenuItem = (event: IpcMainInvokeEvent, ref: string, remote: string) => new MenuItem({
    label: "Set upstream...",
    click() {
        const local = ref;
        sendEvent("dialog:set-upstream", {local, remote});
    }
});

const createTag = (ref: string) => new MenuItem({
    label: "Create tag here...",
    click() {
        sendEvent("dialog:create-tag", {
            sha: ref,
            fromCommit: false
        });
    }
});

const newBranch = (ref: string) => new MenuItem({
    label: "Create new branch...",
    click() {
        sendEvent("dialog:branch-from", {
            sha: ref,
            type: BranchFromType.REF
        });
    }
});

export function openRemotesMenu(_event: IpcMainInvokeEvent, _data: Record<string, string>) {
    const remotesMenu = new Menu();
    remotesMenu.append(new MenuItem({
        label: "Fetch all",
        async click() {
            const result = await provider.fetchFrom(currentRepo(), null);
            if (!result) {
                dialog.showErrorBox("Failed to fetch remotes", "");
            }
        }
    }));
    remotesMenu.append(new MenuItem({
        type: "separator",
    }));
    remotesMenu.append(new MenuItem({
        label: "Add remote...",
        click() {
            sendEvent("dialog:add-remote", null);
        }
    }));
    remotesMenu.popup();
}

export function openRemoteMenu(event: IpcMainInvokeEvent, data: Record<string, string>) {
    const remoteMenu = new Menu();
    remoteMenu.append(new MenuItem({
        label: "Fetch",
        async click() {
            const result = await provider.fetchFrom(currentRepo(), {remote: data.remote});
            if (!result) {
                dialog.showErrorBox("Failed to fetch remote", "");
            }
        }
    }));
    remoteMenu.append(new MenuItem({
        type: "separator"
    }));
    remoteMenu.append(new MenuItem({
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
    }));
    remoteMenu.append(new MenuItem({
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
    }));
    remoteMenu.popup();
}

export function openRemoteRefMenu(event: IpcMainInvokeEvent, data: Record<string, string>) {
    const remoteRefMenu = new Menu();
    remoteRefMenu.append(newBranch(data.ref));
    remoteRefMenu.append(new MenuItem({
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
    }));
    remoteRefMenu.append(new MenuItem({
        type: "separator"
    }));
    remoteRefMenu.append(createTag(data.ref));
    remoteRefMenu.popup();
}

export function openLocalMenu(event: IpcMainInvokeEvent, data: Record<string, string>) {
    const localMenu = new Menu();
    localMenu.append(new MenuItem({
        label: "Checkout",
        async click() {
            sendAction(IpcAction.CHECKOUT_BRANCH, await provider.checkoutBranch(currentRepo(), data.ref));
        }
    }));
    localMenu.append(new MenuItem({
        label: "Pull",
        async click() {
            await menuActionPullChanges(data.ref);
            sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(currentRepo()));
        }
    }));
    localMenu.append(setUpstreamMenuItem(event, data.ref, data.remote));
    localMenu.append(new MenuItem({
        type: "separator",
    }));
    localMenu.append(newBranch(data.ref));
    localMenu.append(new MenuItem({
        label: "Rename...",
        click() {
            sendEvent("dialog:rename-ref", {
                name: data.ref,
                type: BranchType.LOCAL
            });
        }
    }));
    localMenu.append(new MenuItem({
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
    }));
    localMenu.append(new MenuItem({
        type: "separator"
    }));
    localMenu.append(createTag(data.ref));
    localMenu.popup();
}

export function openHeadMenu(event: IpcMainInvokeEvent, data: Record<string, string>) {
    const headMenu = new Menu();
    headMenu.append(new MenuItem({
        label: "Pull",
        async click() {
            await menuActionPullChanges(null);
            sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(currentRepo()));
        }
    }));
    headMenu.append(new MenuItem({
        label: "Push",
        async click() {
            await provider.push(getContext(), null);
            sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(currentRepo()));
        }
    }));
    headMenu.append(setUpstreamMenuItem(event, data.ref, data.remote));
    headMenu.append(new MenuItem({
        type: "separator"
    }));
    headMenu.append(newBranch(data.ref));
    headMenu.append(new MenuItem({
        type: "separator"
    }));
    headMenu.append(createTag(data.ref));
    headMenu.popup();
}

export function openTagMenu(_event: IpcMainInvokeEvent, data: Record<string, string>) {
    const tagMenu = new Menu();
    tagMenu.append(newBranch(data.ref));
    tagMenu.append(new MenuItem({
        label: "Push to remote...",
        async click() {
            const remotes = await currentRepo().getRemoteNames();
            if (remotes.length > 1) {
                sendEvent("dialog:push-tag", {
                    name: data.ref,
                });
            }
            sendEvent("notify", {
                title: "Pushing tag",
            });
            await provider.push(getContext(), {
                remote: remotes[0],
                localBranch: data.ref
            });
            sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(currentRepo()));
        }
    }));
    tagMenu.append(new MenuItem({
        type: "separator"
    }));
    tagMenu.append(new MenuItem({
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
                sendEvent("notify", {
                    title: `Deleting tag '${refName}'`,
                });
                await provider.deleteTag(currentRepo(), {name: refName, remote: result.checkboxChecked});
                sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(currentRepo()));
            }
        }
    }));
    tagMenu.popup();
}

export function openStashMenu(_event: IpcMainInvokeEvent, data: Record<string, string>) {
    const stashMenu = new Menu();
    stashMenu.append(new MenuItem({
        label: "Apply",
        click() {
            provider.stashApply(currentRepo(), Number.parseInt(data.index, 10));
        }
    }));
    stashMenu.append(new MenuItem({
        label: "Pop",
        click() {
            provider.stashPop(currentRepo(), Number.parseInt(data.index, 10));
        }
    }));
    stashMenu.append(new MenuItem({
        label: "Drop",
        click() {
            provider.stashDrop(currentRepo(), Number.parseInt(data.index, 10));
        }
    }));
    stashMenu.popup();
}
