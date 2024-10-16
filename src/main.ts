import { exec, spawn } from "node:child_process";
import { basename, join } from "node:path";
import process from "node:process";

import { clipboard, screen, shell } from "electron";
import { app, BrowserWindow, dialog, ipcMain, type IpcMainEvent, Menu, type MenuItemConstructorOptions } from "electron/main";

import type { Commit, Object, Reference } from "nodegit";

import nodegit from "nodegit";

import {
  addRecentRepository,
  clearRepoProfile,
  currentProfile,
  diffOptionsIsEqual,
  getAppConfig,
  getRecentRepositories,
  getRepoProfile,
  saveAppConfig,
  setCurrentProfile,
  setRepoProfile,
  signatureFromActiveProfile,
  signatureFromProfile,
} from "./Main/Config.js";
import { isMac, isWindows } from "./Main/Utils.js";

import type { AsyncIpcActionReturnOrError, IpcActionParams, IpcActionReturnOrError } from "./Common/Actions.js";
import { IpcAction, Locks } from "./Common/Actions.js";
import { normalizeLocalName } from "./Common/Branch.js";
import { formatTimeAgo } from "./Common/Utils.js";
import * as provider from "./Main/Provider.js";
import * as uiActions from "./Main/UiActions.js";
import { requestClientData, sendEvent } from "./Main/WindowEvents.js";

import { AppEventType, RendererRequestEvents } from "./Common/WindowEventTypes.js";

// eslint-disable-next-line import/no-unresolved
import { buildDateTime, lastCommit } from "env";
import { currentRepo, getLastKnownHead, setRepo, setWindow } from "./Main/Context.js";
import { handleContextMenu } from "./Main/ContextMenu/index.js";
import { handleDialog } from "./Main/Dialogs/index.js";
import { actionLock, eventReply, sendAction } from "./Main/IPC.js";
import { ObjectTYPE, StashFLAGS } from "./Main/NodegitEnums.js";

Menu.setApplicationMenu(null);

app.commandLine.appendSwitch("disable-smooth-scrolling");

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  applyAppMenu();

  const initialWindowWidth = 1024;
  const initialWindowHeight = 600;

  // Create the browser window.
  const win = new BrowserWindow({
    height: initialWindowHeight,
    width: initialWindowWidth,
    minHeight: initialWindowHeight,
    minWidth: initialWindowWidth,
    webPreferences: {
      preload: join(import.meta.dirname, "../dist/preload.js"),
      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true,
      disableBlinkFeatures: "Auxclick",
    },
  });
  setWindow(win);

  const cursorPosition = screen.getCursorScreenPoint();
  const activeDisplay = screen.getDisplayNearestPoint(cursorPosition);

  win.setPosition(
    activeDisplay.bounds.x + activeDisplay.size.width / 2 - initialWindowWidth / 2,
    activeDisplay.bounds.y + activeDisplay.size.height / 2 - initialWindowHeight / 2,
  );

  win.addListener("focus", async () => {
    if (getAppConfig().ui.refreshWorkdirOnFocus && currentRepo() && !provider.isRefreshingWorkdir()) {
      const currentHead = await currentRepo().getHeadCommit();
      if (!getLastKnownHead() || !currentHead.id().equal(getLastKnownHead())) {
        sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(currentRepo()));
      }
      await provider.sendRefreshWorkdirEvent(currentRepo());
    }
  });

  // win.webContents.openDevTools();

  win.loadFile(join(import.meta.dirname, "../dist/index.html"));

  win.webContents.on("will-navigate", e => {
    e.preventDefault();
  });
  win.webContents.setWindowOpenHandler(() => {
    return {
      action: "deny",
    };
  });

  ipcMain.on("context-menu", handleContextMenu);
  ipcMain.handle("dialog", handleDialog);
});

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  app.quit();
});

function buildOpenRepoMenuItem(path: string): MenuItemConstructorOptions {
  const repoName = basename(path);
  return {
    label: `${repoName} - ${path.slice(-60 + repoName.length)}`,
    async click() {
      await openRepo(path);
    },
  };
}

function applyAppMenu(): void {
  const repo = currentRepo();
  const menuTemplate = [
    ...isMac
      ? [{
        label: app.name,
        submenu: [
          { role: "about" },
          { type: "separator" },
          { role: "services" },
          { type: "separator" },
          { role: "hide" },
          { role: "hideothers" },
          { role: "unhide" },
          { type: "separator" },
          { role: "quit" },
        ],
      }]
      : [],
    {
      label: "File",
      submenu: [
        {
          label: "Clone...",
          async click() {
            const data = await requestClientData(RendererRequestEvents.CLONE_DIALOG, null);
            if (data) {
              try {
                const clonedRepo = await provider.clone(data.source, data.target);
                await openRepo(clonedRepo.workdir());
              } catch (err) {
                console.warn(err);
                if (err instanceof Error) {
                  dialog.showErrorBox("Clone failed", err.message);
                }
              }
            }
          },
        },
        {
          label: "Init...",
          async click() {
            const data = await requestClientData(RendererRequestEvents.INIT_DIALOG, null);
            if (data) {
              const initialRepo = await nodegit.Repository.init(data.source, 0);
              await openRepo(initialRepo.workdir());
            }
          },
        },
        {
          type: "separator",
        },
        {
          label: "Open...",
          accelerator: "CmdOrCtrl+O",
          async click() {
            await openRepoDialog();
          },
        },
        {
          label: "Open Recent...",
          type: "submenu",
          submenu: getRecentRepositories().map(buildOpenRepoMenuItem),
        },
        {
          type: "separator",
        },
        {
          enabled: !!currentRepo(),
          label: "Open in Terminal",
          accelerator: "CmdOrCtrl+Shift+C",
          click: openRepoInTerminal,
        },
        {
          enabled: !!repo,
          label: "Open in File Manager",
          click: openRepoInFileManager,
        },
        {
          type: "separator",
        },
        {
          label: "Preferences...",
          accelerator: "CmdOrCtrl+,",
          click() {
            sendEvent(AppEventType.OPEN_SETTINGS, null);
          },
        },
        {
          type: "separator",
        },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        ...(isMac
          ? [
            { role: "pasteAndMatchStyle" },
            { role: "delete" },
            { role: "selectAll" },
            { type: "separator" },
            {
              label: "Speech",
              submenu: [
                { role: "startspeaking" },
                { role: "stopspeaking" },
              ],
            },
          ]
          : [
            { role: "delete" },
            { type: "separator" },
            { role: "selectAll" },
          ]),
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forcereload" },
        { role: "toggledevtools" },
        { type: "separator" },
        { role: "resetzoom" },
        { role: "zoomin" },
        { role: "zoomout" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    ...repo
      ? [{
        label: "Repository",
        submenu: [
          {
            label: "Fetch all",
            async click() {
              await provider.fetchRemoteFrom(repo, null);
              sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));
            },
          },
          {
            label: "Refresh",
            async click() {
              await provider.sendRefreshWorkdirEvent(repo);
            },
          },
          {
            label: "Pull...",
            async click() {
              await uiActions.pullHead();
            },
          },
          {
            label: "Push...",
            async click() {
              await uiActions.pushHead();
            },
          },
          {
            type: "separator",
          },
          {
            label: "Compare revisions...",
            async click() {
              const revisions = await requestClientData(RendererRequestEvents.COMPARE_REVISIONS_DIALOG, null);
              if (revisions) {
                const compare = await provider.tryCompareRevisions(currentRepo(), revisions);
                if (compare instanceof Error) {
                  dialog.showErrorBox("Error", compare.toString());
                } else {
                  sendEvent(AppEventType.OPEN_COMPARE_REVISIONS, compare);
                }
              }
            },
          },
          {
            label: "View commit...",
            async click() {
              const commitSha = await requestClientData(RendererRequestEvents.GET_COMMIT_SHA_DIALOG, null);
              if (commitSha) {
                sendEvent(AppEventType.SET_DIFFPANE, commitSha);
              }
            },
          },
          {
            label: "File history...",
            async click() {
              const filePath = await requestClientData(RendererRequestEvents.FILE_HISTORY_DIALOG, null);
              if (filePath) {
                const commits = await provider.getFileCommits(currentRepo(), { file: filePath });
                sendAction(IpcAction.LOAD_FILE_COMMITS, commits);
              }
            },
          },
        ],
      }, {
        label: "Stash",
        submenu: [
          {
            label: "Stash",
            async click() {
              // TODO: Stash message
              await nodegit.Stash.save(repo, signatureFromActiveProfile(), "Stash", StashFLAGS.DEFAULT);
              await provider.sendRefreshWorkdirEvent(repo);
              sendAction(IpcAction.LOAD_STASHES, await provider.getStash(repo));
              sendEvent(AppEventType.NOTIFY, { title: "Stashed changes" });
            },
          },
          {
            label: "Pop latest stash",
            click() {
              provider.stashPop(repo, 0);
            },
          },
          {
            label: "Apply latest stash",
            click() {
              provider.stashApply(repo, 0);
            },
          },
          {
            label: "Drop latest stash",
            click() {
              provider.stashDrop(repo, 0);
            },
          },
        ],
      }]
      : [],
    // { role: 'windowMenu' }
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? [
            { type: "separator" },
            { role: "front" },
            { type: "separator" },
            { role: "window" },
          ]
          : [
            { role: "close" },
          ]),
      ],
    },
    {
      role: "help",
      submenu: [
        {
          label: "Homepage",
          click() {
            shell.openExternal("https://github.com/weedz/git-good");
          },
        },
        {
          type: "separator",
        },
        {
          label: "About",
          async click() {
            const buildDate = new Date(buildDateTime);
            const versionsString = `Version: ${app.getVersion()}\n`
              + `Commit: ${lastCommit}\n`
              + `Date: ${buildDate.toISOString()} (${formatTimeAgo(buildDate)})\n`
              + `Electron: ${process.versions.electron}\n`
              + `Chromium: ${process.versions.chrome}\n`
              + `Node: ${process.versions.node}\n`
              + `V8: ${process.versions.v8}\n`
              + `OS: ${process.getSystemVersion()}`;
            const response = await dialog.showMessageBox({
              message: "git-good",
              type: "info",
              title: "git-good",
              detail: versionsString,
              buttons: ["Copy", "OK"],
              defaultId: 1,
            });
            if (response.response === 0) {
              clipboard.writeText(versionsString);
            }
          },
        },
      ],
    },
  ] as MenuItemConstructorOptions[];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

type EventArgs = {
  action: IpcAction;
  data: IpcActionParams[IpcAction];
  id?: string;
};

type PromiseEventCallback<A extends IpcAction> = (repo: nodegit.Repository, args: IpcActionParams[A], event: IpcMainEvent) => IpcActionReturnOrError<A> | AsyncIpcActionReturnOrError<A>;

const eventMap: {
  [A in IpcAction]: PromiseEventCallback<A> | (() => void);
} = {
  [IpcAction.INIT]: async () => {
    const recentRepo = getRecentRepositories()[0];
    if (recentRepo) {
      await openRepo(recentRepo);
    }
    return null;
  },
  [IpcAction.LOAD_BRANCHES]: provider.getBranches,
  [IpcAction.LOAD_HEAD]: provider.getHEAD,
  [IpcAction.LOAD_UPSTREAMS]: provider.getUpstreamRefs,
  [IpcAction.LOAD_COMMIT]: provider.loadCommit,
  [IpcAction.LOAD_COMMITS]: provider.getCommits,
  [IpcAction.LOAD_FILE_COMMITS]: provider.getFileCommits,
  [IpcAction.LOAD_PATCHES_WITHOUT_HUNKS]: async (_, args) => await provider.getCommitPatches(args.sha, getAppConfig().diffOptions),
  [IpcAction.FILE_DIFF_AT]: async (repo, args) => await provider.diffFileAtCommit(repo, args.file, args.sha),
  [IpcAction.LOAD_HUNKS]: async (repo, arg) => {
    return {
      path: arg.path,
      hunks: await provider.getHunksWithParams(repo, arg),
    };
  },
  [IpcAction.SHOW_STASH]: provider.showStash,
  [IpcAction.CHECKOUT_BRANCH]: provider.checkoutBranch,
  [IpcAction.GET_CHANGES]: provider.loadChanges,
  [IpcAction.GET_UNSTAGED_CHANGES]: provider.loadUnstagedChanges,
  [IpcAction.GET_STAGED_CHANGES]: provider.loadStagedChanges,
  [IpcAction.STAGE_FILE]: async (repo, data) => {
    const result = await provider.stageFile(repo, data);
    await provider.sendRefreshWorkdirEvent(repo);
    return result;
  },
  [IpcAction.UNSTAGE_FILE]: async (repo, data) => {
    const result = await provider.unstageFile(repo, data);
    await provider.sendRefreshWorkdirEvent(repo);
    return result;
  },
  [IpcAction.STAGE_ALL]: async (repo) => {
    const result = await provider.stageAllFiles(repo);
    await provider.sendRefreshWorkdirEvent(repo);
    return result;
  },
  [IpcAction.UNSTAGE_ALL]: async (repo) => {
    const result = await provider.unstageAllFiles(repo);
    await provider.sendRefreshWorkdirEvent(repo);
    return result;
  },
  [IpcAction.CREATE_BRANCH]: async (repo, data) => {
    try {
      const res = await repo.createBranch(data.name, data.sha);
      if (data.checkout) {
        await repo.checkoutBranch(data.name);
      }
      sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));
      return res !== null;
    } catch (err) {
      return err as Error;
    }
  },
  [IpcAction.CREATE_BRANCH_FROM_REF]: async (repo, data) => {
    let ref;
    try {
      ref = await repo.getReference(data.ref);
    } catch (err) {
      return err as Error;
    }

    const sha = ref.isTag() ? (await ref.peel(ObjectTYPE.COMMIT as unknown as Object.TYPE)) as unknown as Commit : await repo.getReferenceCommit(data.ref);

    try {
      const res = await repo.createBranch(data.name, sha);
      if (data.checkout) {
        await repo.checkoutBranch(data.name);
      }
      sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));
      return res !== null;
    } catch (err) {
      return err as Error;
    }
  },
  // TODO: Should we allow renaming remote refs? Can we use the same call for remote refs?
  [IpcAction.RENAME_LOCAL_BRANCH]: async (repo, data) => {
    if (normalizeLocalName(data.ref) === data.name) {
      return true;
    }

    const ref = await repo.getReference(data.ref);

    let renamedRef: Reference | null = null;
    if (ref.isBranch() && !ref.isRemote()) {
      // We only allow rename of a local branch (so the name should begin with "refs/heads/")
      renamedRef = await ref.rename(`refs/heads/${data.name}`, 0, "renamed");
    }

    sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));

    return !!renamedRef;
  },
  [IpcAction.FIND_FILE]: provider.findFile,
  [IpcAction.PUSH]: async (_repo, data) => await uiActions.push(data),
  [IpcAction.SET_UPSTREAM]: async (repo, data) => {
    const result = await provider.setUpstream(repo, data.local, data.remote);
    if (result) {
      sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));
    }
    return result;
  },
  [IpcAction.COMMIT]: async (repo, data) => {
    const result = await provider.doCommit(repo, data);
    if (!(result instanceof Error)) {
      sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));
      await provider.sendRefreshWorkdirEvent(repo);
    }
    return result;
  },
  [IpcAction.REMOTES]: provider.getRemotes,
  [IpcAction.RESOLVE_CONFLICT]: async (repo, { path }) => {
    const result = await provider.resolveConflict(repo, path);
    await provider.sendRefreshWorkdirEvent(repo);
    return result;
  },
  [IpcAction.EDIT_REMOTE]: async (repo, data, event) => {
    if (!nodegit.Remote.isValidName(data.name)) {
      return Error("Invalid remote name");
    }

    if (data.oldName !== data.name) {
      await nodegit.Remote.rename(repo, data.oldName, data.name);
    }

    nodegit.Remote.setUrl(repo, data.name, data.pullFrom);

    if (data.pushTo) {
      nodegit.Remote.setPushurl(repo, data.name, data.pushTo);
    }

    await provider.fetchRemoteFrom(repo, { remote: data.name });

    eventReply(event, IpcAction.REMOTES, await provider.getRemotes(repo));
    eventReply(event, IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));

    return true;
  },
  [IpcAction.NEW_REMOTE]: async (repo, data, event) => {
    let remote;
    try {
      remote = await nodegit.Remote.create(repo, data.name, data.pullFrom);
    } catch (err) {
      return err as Error;
    }

    if (data.pushTo) {
      nodegit.Remote.setPushurl(repo, data.name, data.pushTo);
    }

    if (!await provider.fetchRemote([remote])) {
      // Deleting remote with (possibly) invalid url
      await nodegit.Remote.delete(repo, data.name);
      return false;
    }

    eventReply(event, IpcAction.REMOTES, await provider.getRemotes(repo));
    eventReply(event, IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));

    return true;
  },
  [IpcAction.FETCH]: async (repo, data) => {
    const result = await provider.fetchRemoteFrom(repo, data);
    if (result) {
      sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));
    }
    return result;
  },
  [IpcAction.SAVE_SETTINGS]: async (repo, data) => {
    setCurrentProfile(data.selectedProfile);
    try {
      if (!diffOptionsIsEqual(data.diffOptions)) {
        await provider.sendRefreshWorkdirEvent(repo);
      }
      saveAppConfig(data);
      return true;
    } catch (err) {
      if (err instanceof Error) {
        dialog.showErrorBox("Failed to save settings", err.message);
      }
    }
    return false;
  },
  [IpcAction.REPO_PROFILE]: (repo, data) => {
    if (data.action === "remove") {
      clearRepoProfile(repo);
      return true;
    }

    return setRepoProfile(repo, data.profileId);
  },
  [IpcAction.GET_SETTINGS]: (_) => {
    return getAppConfig();
  },
  [IpcAction.CREATE_TAG]: async (repo, data) => {
    const profile = currentProfile();
    const result = await provider.createTag(repo, data, signatureFromProfile(profile), profile.gpg?.tag ? profile.gpg.key : undefined);
    if (result) {
      sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));
    }
    return result;
  },
  [IpcAction.LOAD_STASHES]: provider.getStash,
  [IpcAction.GET_COMMIT_GPG_SIGN]: provider.getCommitGpgSign,
  [IpcAction.LOAD_TREE_AT_COMMIT]: provider.loadTreeAtCommit,
  [IpcAction.CONTINUE_REBASE]: async (repo) => {
    const result = await provider.continueRebase(repo);
    if (result) {
      await provider.sendRefreshWorkdirEvent(currentRepo());
      sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));
    }
    return result;
  },
  [IpcAction.OPEN_IN_TERMINAL]: openRepoInTerminal,
  [IpcAction.OPEN_IN_FILE_MANAGER]: openRepoInFileManager,
  [IpcAction.REQUEST_OPEN_REPO]: openRepoDialog,
  [IpcAction.GET_RECENT_REPOSITORIES]: getRecentRepositories,
  [IpcAction.OPEN_REPOSITORY]: (_, repoPath) => openRepo(repoPath),
  [IpcAction.PULL]: uiActions.pullHead,
} as const;

const ALLOWED_WHEN_NOT_IN_REPO = {
  [IpcAction.INIT]: true,
  [IpcAction.GET_SETTINGS]: true,
  [IpcAction.SAVE_SETTINGS]: true,
} as const;

ipcMain.on("asynchronous-message", async (event, arg: EventArgs) => {
  const action = arg.action;
  const lock = actionLock[action];
  if (lock && !lock.interuptable) {
    eventReply(event, action, Error("action pending"), arg.id);
    return;
  }

  actionLock[action] = { interuptable: false };

  if (!currentRepo() && !(action in ALLOWED_WHEN_NOT_IN_REPO)) {
    eventReply(event, action, Error("Not in a repository"), arg.id);
    return;
  }

  const callback = eventMap[action] as PromiseEventCallback<typeof action>;
  const data = arg.data as IpcActionParams[typeof action];
  eventReply(event, action, await callback(currentRepo(), data, event), arg.id);
});

async function openRepoDialog(): Promise<boolean | null> {
  sendEvent(AppEventType.LOCK_UI, Locks.MAIN);

  const repo = currentRepo();
  const currentRepoDir = repo?.workdir();

  const res = await dialog.showOpenDialog({
    properties: ["openDirectory"],
    title: "Open repository...",
    defaultPath: currentRepoDir || undefined,
  });
  if (res.canceled) {
    sendEvent(AppEventType.UNLOCK_UI, Locks.MAIN);
    return null;
  }

  const result = await openRepo(res.filePaths[0]);

  sendEvent(AppEventType.UNLOCK_UI, Locks.MAIN);

  return result;
}

async function openRepo(repoPath: string): Promise<boolean> {
  if (repoPath.endsWith("/")) {
    repoPath = repoPath.slice(0, -1);
  }
  const opened = await provider.openRepo(repoPath);

  if (!opened) {
    dialog.showErrorBox("No repository", `'${repoPath}' does not contain a git repository`);
    return false;
  }

  sendEvent(AppEventType.REPO_OPENED, {
    opened: !!opened,
    path: repoPath,
    status: provider.repoStatus(opened),
  });

  setRepo(opened);

  addRecentRepository(repoPath);

  applyAppMenu();

  const repoProfile = await getRepoProfile(opened);

  let body;
  if (repoProfile !== false) {
    const profile = setCurrentProfile(repoProfile);
    body = `Profile set to '${profile?.profileName}'`;
  }
  sendEvent(AppEventType.NOTIFY, { title: "Repo opened", body });
  provider.getRemotes(opened).then(remotes => sendAction(IpcAction.REMOTES, remotes));
  provider.getBranches(opened).then(branches => sendAction(IpcAction.LOAD_BRANCHES, branches));
  provider.getStash(opened).then(stash => sendAction(IpcAction.LOAD_STASHES, stash));

  provider.sendRefreshWorkdirEvent(opened);

  return true;
}

function openRepoInTerminal() {
  const repo = currentRepo();
  if (repo) {
    let process;
    if (isWindows) {
      const exe = getAppConfig().terminal || "cmd.exe";
      process = exec(`start ${exe}`, {
        cwd: repo.workdir(),
      });
    } else if (isMac) {
      const exe = getAppConfig().terminal || "Terminal";
      process = spawn("open", ["-a", exe, "."], {
        cwd: repo.workdir(),
      });
    } else {
      process = spawn(getAppConfig().terminal || "x-terminal-emulator", {
        cwd: repo.workdir(),
      });
    }
    process.on("error", err => {
      dialog.showErrorBox("Failed to open terminal", err.message);
    });
  }
}
function openRepoInFileManager() {
  const repo = currentRepo();
  // FIXME: `shell.openExternal` locks the main thread?
  repo && shell.showItemInFolder(repo.path());
}
