import { basename, join } from "path";
import { exec, spawn } from "child_process";

import { shell, clipboard, screen } from "electron";
import { app, BrowserWindow, ipcMain, Menu, dialog, MenuItemConstructorOptions, IpcMainEvent } from "electron/main";


import { Commit, Object, Reference, Remote, Repository, Stash } from "nodegit";

import { isMac, isWindows } from "./Main/Utils";
import { addRecentRepository, clearRepoProfile, currentProfile, diffOptionsIsEqual, getAppConfig, getRecentRepositories, getRepoProfile, saveAppConfig, setCurrentProfile, setRepoProfile, signatureFromActiveProfile, signatureFromProfile } from "./Main/Config";

import * as provider from "./Main/Provider";
import { IpcAction, IpcActionParams, Locks, AsyncIpcActionReturnOrError } from "./Common/Actions";
import { formatTimeAgo } from "./Common/Utils";
import { requestClientData, sendEvent } from "./Main/WindowEvents";
import { normalizeLocalName } from "./Common/Branch";

import { AppEventType, RendererRequestEvents } from "./Common/WindowEventTypes";

// eslint-disable-next-line import/no-unresolved
import { lastCommit, buildDateTime } from "env";
import { handleContextMenu } from "./Main/ContextMenu";
import { handleDialog } from "./Main/Dialogs";
import { currentRepo, currentWindow, getContext, getLastKnownHead, setRepo, setWindow } from "./Main/Context";
import { actionLock, eventReply, sendAction } from "./Main/IPC";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore, this is apparently a thing. Needed to set a real app_id under wayland
app.setDesktopName("git-good");

ipcMain.on("context-menu", handleContextMenu);
ipcMain.handle("dialog", handleDialog);

app.commandLine.appendSwitch("disable-smooth-scrolling");

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    const initialWindowWidth = 1024;
    const initialWindowHeight = 600;

    // Create the browser window.
    const win = new BrowserWindow({
        height: initialWindowHeight,
        width: initialWindowWidth,
        minHeight: initialWindowHeight,
        minWidth: initialWindowWidth,
        webPreferences: {
            preload: join(__dirname, "../dist/preload.js"),
            nodeIntegration: true,
            contextIsolation: true,
            disableBlinkFeatures: "Auxclick"
        }
    });
    setWindow(win);

    const cursorPosition = screen.getCursorScreenPoint();
    const activeDisplay = screen.getDisplayNearestPoint(cursorPosition);

    win.setPosition(
        activeDisplay.bounds.x + activeDisplay.size.width / 2 - initialWindowWidth / 2,
        activeDisplay.bounds.y + activeDisplay.size.height / 2 - initialWindowHeight / 2
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

    win.loadFile(join(__dirname, "../dist/index.html"));

    win.webContents.on("will-navigate", e => {
        e.preventDefault();
    });
    win.webContents.setWindowOpenHandler(() => {
        return {
            action: "deny"
        }
    });
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
        }
    }
}

function applyAppMenu() {
    const repo = currentRepo();
    const win = currentWindow();
    const menuTemplate = [
        ...isMac ? [{
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
                { role: "quit" }
            ]
        }] : [],
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
                    }
                },
                {
                    label: "Init...",
                    async click() {
                        const data = await requestClientData(RendererRequestEvents.INIT_DIALOG, null);
                        if (data) {
                            const initialRepo = await Repository.init(data.source, 0);
                            await openRepo(initialRepo.workdir());
                        }
                    }
                },
                {
                    type: "separator"
                },
                {
                    label: "Open...",
                    accelerator: "CmdOrCtrl+O",
                    async click() {
                        await openRepoDialog();
                    }
                },
                {
                    label: "Open Recent...",
                    type: "submenu",
                    submenu: getRecentRepositories().map(buildOpenRepoMenuItem)
                },
                {
                    type: "separator"
                },
                {
                    enabled: !!currentRepo(),
                    label: "Open in Terminal",
                    accelerator: "CmdOrCtrl+Shift+C",
                    click() {
                        if (repo) {
                            let process;
                            if (isWindows) {
                                const exe = getAppConfig().terminal || "cmd.exe";
                                process = exec(`start ${exe}`, {
                                    cwd: repo.workdir()
                                });
                            } else if (isMac) {
                                const exe = getAppConfig().terminal || "Terminal";
                                process = spawn("open", ["-a", exe, "."], {
                                    cwd: repo.workdir()
                                });
                            } else {
                                process = spawn(getAppConfig().terminal || "x-terminal-emulator", {
                                    cwd: repo.workdir()
                                });
                            }
                            process.on("error", err => {
                                dialog.showErrorBox("Failed to open terminal", err.message);
                            });
                        }
                    }
                },
                {
                    enabled: !!repo,
                    label: "Open in File Manager",
                    click() {
                        repo && shell.openPath(repo.workdir());
                    }
                },
                {
                    type: "separator"
                },
                {
                    label: "Preferences...",
                    accelerator: "CmdOrCtrl+,",
                    click() {
                        sendEvent(AppEventType.OPEN_SETTINGS, null);
                    }
                },
                {
                    type: "separator"
                },
                isMac ? { role: "close" } : { role: "quit" },
            ]
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
                ...(isMac ? [
                    { role: "pasteAndMatchStyle" },
                    { role: "delete" },
                    { role: "selectAll" },
                    { type: "separator" },
                    {
                        label: "Speech",
                        submenu: [
                            { role: "startspeaking" },
                            { role: "stopspeaking" }
                        ]
                    }
                ] : [
                    { role: "delete" },
                    { type: "separator" },
                    { role: "selectAll" }
                ])
            ]
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
                { role: "togglefullscreen" }
            ]
        },
        ...repo ? [{
            label: "Repository",
            submenu: [
                {
                    label: "Fetch all",
                    async click() {
                        if (!repo) {
                            return dialog.showErrorBox("Error", "Not in a repository");
                        }
                        await provider.fetchFrom(repo, null);
                        sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));
                    }
                },
                {
                    label: "Refresh",
                    async click() {
                        await provider.sendRefreshWorkdirEvent(repo);
                    }
                },
                {
                    label: "Pull...",
                    async click() {
                        sendEvent(AppEventType.LOCK_UI, Locks.BRANCH_LIST);
                        await provider.pull(repo, null, signatureFromActiveProfile());
                        sendEvent(AppEventType.UNLOCK_UI, Locks.BRANCH_LIST);
                        sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));
                    }
                },
                {
                    label: "Push...",
                    async click() {
                        sendEvent(AppEventType.LOCK_UI, Locks.BRANCH_LIST);
                        const result = await provider.push({repo, win}, null);
                        if (result instanceof Error) {
                            dialog.showErrorBox("Failed to push", result.message);
                        } else {
                            sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));
                        }
                        sendEvent(AppEventType.UNLOCK_UI, Locks.BRANCH_LIST);
                    }
                },
                {
                    type: "separator"
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
                    }
                },
                {
                    label: "View commit...",
                    async click() {
                        const commitSha = await requestClientData(RendererRequestEvents.GET_COMMIT_SHA_DIALOG, null);
                        if (commitSha) {
                            sendEvent(AppEventType.SET_DIFFPANE, commitSha);
                        }
                    }
                },
                {
                    label: "File history...",
                    async click() {
                        const filePath = await requestClientData(RendererRequestEvents.FILE_HISTORY_DIALOG, null);
                        if (filePath) {
                            const commits = await provider.getFileCommits(currentRepo(), { file: filePath });
                            sendAction(IpcAction.LOAD_FILE_COMMITS, commits);
                        }
                    }
                },
            ]
        }, {
            label: "Stash",
            submenu: [
                {
                    label: "Stash",
                    async click() {
                        // TODO: Stash message
                        await Stash.save(repo, signatureFromActiveProfile(), "Stash", Stash.FLAGS.DEFAULT);
                        await provider.sendRefreshWorkdirEvent(repo);
                        sendAction(IpcAction.LOAD_STASHES, await provider.getStash(repo));
                        sendEvent(AppEventType.NOTIFY, {title: "Stashed changes"});
                    }
                },
                {
                    label: "Pop latest stash",
                    click() {
                        provider.stashPop(repo, 0);
                    }
                },
                {
                    label: "Apply latest stash",
                    click() {
                        provider.stashApply(repo, 0);
                    }
                },
                {
                    label: "Drop latest stash",
                    click() {
                        provider.stashDrop(repo, 0);
                    }
                }
            ]
        }] : [],
        // { role: 'windowMenu' }
        {
            label: "Window",
            submenu: [
                { role: "minimize" },
                { role: "zoom" },
                ...(isMac ? [
                    { type: "separator" },
                    { role: "front" },
                    { type: "separator" },
                    { role: "window" }
                ] : [
                    { role: "close" }
                ])
            ]
        },
        {
            role: "help",
            submenu: [
                {
                    label: "Homepage",
                    async click() {
                        shell.openExternal("https://github.com/weedz/git-good");
                    }
                },
                {
                    type: "separator"
                },
                {
                    label: "About",
                    async click() {
                        const buildDate = new Date(buildDateTime);
                        const versionsString = `Version: ${app.getVersion()}\n` +
                            `Commit: ${lastCommit}\n` +
                            `Date: ${buildDate.toISOString()} (${formatTimeAgo(buildDate)})\n` +
                            `Electron: ${process.versions.electron}\n` +
                            `Chromium: ${process.versions.chrome}\n` +
                            `Node: ${process.versions.node}\n` +
                            `V8: ${process.versions.v8}\n` +
                            `OS: ${process.getSystemVersion()}`;
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
                    }
                },
            ]
        }
    ] as MenuItemConstructorOptions[];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
}
applyAppMenu();

type EventArgs = {
    action: IpcAction
    data: IpcActionParams[IpcAction]
    id?: string
};

type PromiseEventCallback<A extends IpcAction> = (repo: Repository, args: IpcActionParams[A], event: IpcMainEvent) => AsyncIpcActionReturnOrError<A>;

const eventMap: {
    [A in IpcAction]: PromiseEventCallback<A>
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
    [IpcAction.LOAD_PATCHES_WITHOUT_HUNKS]: async (_, args) => provider.getCommitPatches(args.sha, getAppConfig().diffOptions),
    [IpcAction.FILE_DIFF_AT]: async (repo, args) => provider.diffFileAtCommit(repo, args.file, args.sha),
    [IpcAction.LOAD_HUNKS]: async (repo, arg) => {
        return {
            path: arg.path,
            hunks: await loadHunks(repo, arg)
        };
    },
    [IpcAction.SHOW_STASH]: provider.showStash,
    [IpcAction.CHECKOUT_BRANCH]: provider.checkoutBranch,
    [IpcAction.GET_CHANGES]: provider.loadChanges,
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

        const sha = ref.isTag() ? (await ref.peel(Object.TYPE.COMMIT)) as unknown as Commit : await repo.getReferenceCommit(data.ref);

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
    [IpcAction.PUSH]: async (repo, data) => {
        const result = await provider.push(getContext(), data);
        if (!(result instanceof Error)) {
            sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));
        }
        return result;
    },
    [IpcAction.SET_UPSTREAM]: async (repo, data) => {
        const result = await provider.setUpstream(repo, data.local, data.remote);
        // Returns 0 on success
        if (!result) {
            sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));
        }
        return !result;
    },
    [IpcAction.COMMIT]: async (repo, data) => {
        const result = await provider.getCommit(repo, data);
        if (!(result instanceof Error)) {
            sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));
            await provider.sendRefreshWorkdirEvent(repo);
        }
        return result;
    },
    [IpcAction.REMOTES]: provider.getRemotes,
    [IpcAction.RESOLVE_CONFLICT]: async (repo, {path}) => {
        const result = await provider.resolveConflict(repo, path);
        await provider.sendRefreshWorkdirEvent(repo);
        return result;
    },
    [IpcAction.EDIT_REMOTE]: async (repo, data, event) => {
        if (!Remote.isValidName(data.name)) {
            return Error("Invalid remote name");
        }

        if (data.oldName !== data.name) {
            await Remote.rename(repo, data.oldName, data.name);
        }

        Remote.setUrl(repo, data.name, data.pullFrom);

        if (data.pushTo) {
            Remote.setPushurl(repo, data.name, data.pushTo);
        }

        await provider.fetch([await repo.getRemote(data.name)]);

        eventReply(event, IpcAction.REMOTES, await provider.getRemotes(repo));
        eventReply(event, IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));

        return true;
    },
    [IpcAction.NEW_REMOTE]: async (repo, data, event) => {
        let remote;
        try {
            remote = await Remote.create(repo, data.name, data.pullFrom);
        } catch (err) {
            return err as Error;
        }

        if (data.pushTo) {
            Remote.setPushurl(repo, data.name, data.pushTo);
        }

        if (!await provider.fetch([remote])) {
            // Deleting remote with (possibly) invalid url
            await Remote.delete(repo, data.name);
            return false;
        }

        eventReply(event, IpcAction.REMOTES, await provider.getRemotes(repo));
        eventReply(event, IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));

        return true;
    },
    [IpcAction.FETCH]: async (repo, data) => {
        const result = await provider.fetchFrom(repo, data);
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
    [IpcAction.REPO_PROFILE]: async (repo, data) => {
        if (data.action === "remove") {
            clearRepoProfile(repo);
            return true;
        }

        return setRepoProfile(repo, data.profileId);
    },
    [IpcAction.GET_SETTINGS]: async (_) => {
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

    actionLock[action] = {interuptable: false};

    if (!currentRepo() && !(action in ALLOWED_WHEN_NOT_IN_REPO)) {
        eventReply(event, action, Error("Not in a repository"), arg.id);
        return;
    }

    const callback = eventMap[action] as PromiseEventCallback<typeof action>;
    const data = arg.data as IpcActionParams[typeof action];
    eventReply(event, action, await callback(currentRepo(), data, event), arg.id);
});

async function openRepoDialog() {
    sendEvent(AppEventType.LOCK_UI, Locks.MAIN);

    const res = await dialog.showOpenDialog({
        properties: ["openDirectory"],
        title: "Select a repository"
    });
    if (res.canceled) {
        sendEvent(AppEventType.UNLOCK_UI, Locks.MAIN);
        return null;
    }

    const result = await openRepo(res.filePaths[0]);

    sendEvent(AppEventType.UNLOCK_UI, Locks.MAIN);

    return result;
}

async function openRepo(repoPath: string) {
    if (repoPath.endsWith("/")) {
        repoPath = repoPath.slice(0, -1);
    }
    const opened = await provider.openRepo(repoPath);

    if(!opened) {
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
    sendEvent(AppEventType.NOTIFY, {title: "Repo opened", body});
    provider.getRemotes(opened).then(remotes => sendAction(IpcAction.REMOTES, remotes));
    provider.getBranches(opened).then(branches => sendAction(IpcAction.LOAD_BRANCHES, branches));
    provider.getStash(opened).then(stash => sendAction(IpcAction.LOAD_STASHES, stash));

    provider.sendRefreshWorkdirEvent(opened);

    return true;
}

function loadHunks(repo: Repository, params: IpcActionParams[IpcAction.LOAD_HUNKS]) {
    if ("sha" in params) {
        return provider.getHunks(repo, params.sha, params.path);
    }
    if ("compare" in params) {
        return provider.hunksFromCompare(repo, params.path);
    }
    return provider.getWorkdirHunks(repo, params.path, params.type);
}
