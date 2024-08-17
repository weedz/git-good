import { IpcAction } from "../../../Common/Actions.js";
import { BranchFromType } from "../../../Common/Branch.js";
import type { PromiseOrSync } from "../../../Common/TypeHelpers.js";
import { basename } from "../../../Common/Utils.js";
import {
    openDialog_BranchFrom,
    openDialog_Clone,
    openDialog_compare,
    openDialog_createTag,
    openDialog_fileHistory,
    openDialog_SetUpstream,
    openDialog_viewCommit,
} from "../../Data/Dialogs.js";
import { openFile, openSettings } from "../../Data/index.js";
import { ipcGetData, ipcSendMessage } from "../../Data/IPC.js";
import { Store } from "../../Data/store.js";
import { getType } from "../DiffPane/utility.js";

export interface Command {
    label: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
    details?: string;
    action: () => PromiseOrSync<void | true | Command[]>;
    focusAction?: () => PromiseOrSync<void>;
}

function openRecentRepositoryAction(this: Command) {
    this.details && ipcSendMessage(IpcAction.OPEN_REPOSITORY, this.details);
}
function checkoutBranchAction(this: Command) {
    this.data && ipcSendMessage(IpcAction.CHECKOUT_BRANCH, this.data);
}

export const commandPaletteCommandList: Command[] = [
    // REPO
    {
        label: "Repo: Open repository...",
        action() {
            ipcSendMessage(IpcAction.REQUEST_OPEN_REPO, null);
        },
    },
    {
        label: "Repo: Clone repository...",
        action() {
            openDialog_Clone();
        },
    },
    {
        label: "Repo: Open recent repository",
        async action() {
            const recentRepositories = await ipcGetData(IpcAction.GET_RECENT_REPOSITORIES, null);
            return recentRepositories.map(repoPath => ({
                label: basename(repoPath),
                details: repoPath,
                action: openRecentRepositoryAction,
            }));
        },
    },
    {
        label: "Repo: Fetch all",
        action() {
            ipcSendMessage(IpcAction.FETCH, null);
        },
    },
    {
        label: "Repo: Pull",
        action() {
            ipcSendMessage(IpcAction.PULL, null);
        },
    },
    {
        label: "Repo: Push",
        action() {
            ipcSendMessage(IpcAction.PUSH, null);
        },
    },
    {
        label: "Repo: File history...",
        action() {
            // TODO: Send data to main thread?
            openDialog_fileHistory();
        },
    },
    {
        label: "Repo: Compare revisions...",
        action() {
            // TODO: Send data to main thread?
            openDialog_compare();
        },
    },
    {
        label: "Repo: View commit...",
        action() {
            // TODO: Send data to main thread?
            openDialog_viewCommit();
        },
    },
    // Working directory
    {
        label: "Working directory: Stage file...",
        async action() {
            const unstagedChanges = await ipcGetData(IpcAction.GET_UNSTAGED_CHANGES, null);
            return unstagedChanges.map(patch => ({
                label: `[${getType(patch.status)}] ${patch.actualFile.path}`,
                focusAction() {
                    openFile({ workDir: true, patch, type: "unstaged" });
                },
                async action() {
                    await ipcGetData(IpcAction.STAGE_FILE, patch.actualFile.path);
                    return true;
                },
            }));
        },
    },
    // BRANCH
    {
        label: "Branch: Set upstream...",
        action() {
            const local = Store.head?.name;
            const remote = Store.head?.remote;
            if (local) {
                openDialog_SetUpstream(local, remote);
            }
        },
    },
    {
        label: "Branch: Create new branch from HEAD...",
        action() {
            const headRef = Store.head?.name;
            if (headRef) {
                openDialog_BranchFrom(headRef, BranchFromType.REF);
            }
        },
    },
    {
        label: "Branch: Checkout...",
        action() {
            // TODO: remote branches?
            if (!Store.branches) {
                return;
            }
            return Store.branches.local.map(branch => ({
                label: branch.normalizedName,
                data: branch.name,
                action: checkoutBranchAction,
            }));
        },
    },
    // STASH
    {
        label: "Stash: Stash changes",
        action() {
            console.log("TODO: 'Stash changes'");
        },
    },
    {
        label: "Stash: Pop",
        action() {
            console.log("TODO: 'Stash: Pop'");
        },
    },
    {
        label: "Stash: Apply",
        action() {
            console.log("TODO: 'Stash: Apply'");
        },
    },
    {
        label: "Blame: File",
        action() {
            // TODO: return a list where the user can search for a file
            console.log("TODO: 'Blame: File'");
        },
    },
    {
        label: "Tag: Create at HEAD...",
        action() {
            const headRef = Store.head?.name;
            if (headRef) {
                openDialog_createTag(headRef);
            }
        },
    },
    // Settings and misc.
    {
        label: "Open in Terminal",
        action() {
            ipcSendMessage(IpcAction.OPEN_IN_TERMINAL, null);
        },
    },
    {
        label: "Open in File Manager",
        action() {
            ipcSendMessage(IpcAction.OPEN_IN_FILE_MANAGER, null);
        },
    },
    {
        label: "Open preferences",
        action() {
            openSettings();
        },
    },
    /**
     * TOOD:
     *      - Delete branch?
     *      - Branch from ref/sha/commit?
     */
];
