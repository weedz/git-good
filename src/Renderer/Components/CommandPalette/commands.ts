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
  action: () => PromiseOrSync<void | boolean | Command[]>;
  focusAction?: () => PromiseOrSync<void>;
}

function openRecentRepositoryAction(this: Command) {
  if (this.details) {
    ipcSendMessage(IpcAction.OPEN_REPOSITORY, this.details);
  }
}
function checkoutBranchAction(this: Command) {
  if (this.data) {
    ipcSendMessage(IpcAction.CHECKOUT_BRANCH, this.data);
  }
}

export function makeCommand(
  label: Command["label"],
  action: Command["action"],
  data?: any,
  details?: string,
  focusAction?: Command["focusAction"],
): Command {
  return {
    label,
    action,
    data,
    details,
    focusAction,
  };
}

export const commandPaletteCommandList: Command[] = [
  // REPO
  makeCommand("Repo: Open repository", () => {
    ipcSendMessage(IpcAction.REQUEST_OPEN_REPO, null);
  }),
  makeCommand("Repo: Clone", async () => {
    await openDialog_Clone();
  }),
  makeCommand("Repo: Open recent repository...", async () => {
    const recentRepositories = await ipcGetData(IpcAction.GET_RECENT_REPOSITORIES, null);
    return recentRepositories.map((repoPath) =>
      makeCommand(basename(repoPath), openRecentRepositoryAction, undefined, repoPath),
    );
  }),
  makeCommand("Repo: Fetch all", () => {
    ipcSendMessage(IpcAction.FETCH, null);
  }),
  makeCommand("Repo: Pull", () => {
    ipcSendMessage(IpcAction.PULL, null);
  }),
  makeCommand("Repo: Push", () => {
    ipcSendMessage(IpcAction.PUSH, null);
  }),
  // TODO: Send data to main thread?
  makeCommand("Repo: File history...", async () => {
    await openDialog_fileHistory();
  }),
  // TODO: Send data to main thread?
  makeCommand("Repo: Compare revisions...", async () => {
    await openDialog_compare();
  }),
  // TODO: Send data to main thread?
  makeCommand("Repo: View commit...", async () => {
    await openDialog_viewCommit();
  }),
  // Working directory
  makeCommand("Working directory: Stage file...", async () => {
    const unstagedChanges = await ipcGetData(IpcAction.GET_UNSTAGED_CHANGES, null);
    return unstagedChanges.map((patch) =>
      makeCommand(
        `[${getType(patch.status)}] ${patch.actualFile.path}`, // oxlint-disable-line
        async () => {
          await ipcGetData(IpcAction.STAGE_FILE, patch.actualFile.path);
          return true;
        },
        undefined,
        undefined,
        () => openFile({ workDir: true, patch, type: "unstaged" }),
      ),
    );
  }),
  // BRANCH
  makeCommand("Branch: Set upstream...", () => {
    const local = Store.head?.name;
    const remote = Store.head?.remote;
    if (local) {
      openDialog_SetUpstream(local, remote);
    }
  }),
  makeCommand("Branch: Create new branch from HEAD", () => {
    const headRef = Store.head?.name;
    if (headRef) {
      openDialog_BranchFrom(headRef, BranchFromType.REF);
    }
  }),
  makeCommand("Branch: Checkout...", () => {
    // TODO: remote branches?
    if (!Store.branches) {
      return;
    }
    return Store.branches.local.map((branch) =>
      makeCommand(branch.normalizedName, checkoutBranchAction, branch.name),
    );
  }),
  // STASH
  makeCommand("Stash: Stash changes", () => console.log("TODO: 'stash changes'")),
  makeCommand("Stash: Pop", () => console.log("TODO: 'stash: pop'")),
  makeCommand("Stash: Apply", () => console.log("TODO: 'stash: apply'")),
  // TODO: return a list where the user can search for a file
  makeCommand("Blame: File", () => console.log("TODO: 'blame file'")),
  // TAG
  makeCommand("Tag: Create at HEAD...", () => {
    const headRef = Store.head?.name;
    if (headRef) {
      openDialog_createTag(headRef);
    }
  }),
  // Settings and misc.
  makeCommand("Open in Terminal", () => {
    ipcSendMessage(IpcAction.OPEN_IN_TERMINAL, null);
  }),
  makeCommand("Open in File Manager", () => {
    ipcSendMessage(IpcAction.OPEN_IN_FILE_MANAGER, null);
  }),
  makeCommand("Open preferences", () => {
    openSettings();
  }),
  /**
   * TOOD:
   *      - Delete branch?
   *      - Branch from ref/sha/commit?
   */
];
