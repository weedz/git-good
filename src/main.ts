import { basename, join } from "path";
import { exec, spawn } from "child_process";

import { shell, clipboard } from "electron";
import { app, BrowserWindow, ipcMain, Menu, dialog, MenuItemConstructorOptions, IpcMainEvent } from "electron/main";


import { Clone, Commit, Object, Rebase, Reference, Remote, Repository, Stash } from "nodegit";

import { isMac, isWindows } from "./Main/Utils";
import { addRecentRepository, clearRepoProfile, currentProfile, getAppConfig, getRecentRepositories, getRepoProfile, saveAppConfig, setCurrentProfile, setRepoProfile, signatureFromActiveProfile, signatureFromProfile } from "./Main/Config";

import * as provider from "./Main/Provider";
import { IpcAction, IpcActionParams, IpcActionReturn, Locks, AsyncIpcActionReturnOrError } from "./Common/Actions";
import { formatTimeAgo } from "./Common/Utils";
import { requestClientData, sendEvent } from "./Main/WindowEvents";
import { normalizeLocalName } from "./Common/Branch";

import { RendererRequestEvents } from "./Common/WindowEventTypes";

// eslint-disable-next-line import/no-unresolved
import { lastCommit, buildDateTime } from "env";
import { handleContextMenu } from "./Main/ContextMenu";
import { handleDialog } from "./Main/Dialogs";
import { currentRepo, currentWindow, getContext, setRepo, setWindow } from "./Main/Context";
import { actionLock, eventReply, sendAction } from "./Main/IPC";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore, this is apparently a thing. Needed to set a real app_id under wayland
app.setDesktopName("git-good");

ipcMain.on("context-menu", handleContextMenu);
ipcMain.handle("dialog", handleDialog);

const createWindow = () => {
    // TODO: `screen.getCursorScreenPoint()` triggers a segfault on wayland?
    // const cursorPosition = screen.getCursorScreenPoint();
    // const activeDisplay = screen.getDisplayNearestPoint(cursorPosition);

    const initialWindowWidth = 1024;
    const initialWindowHeight = 600;


    // Create the browser window.
    const win = new BrowserWindow({
        // x: activeDisplay.bounds.x + activeDisplay.size.width / 2 - initialWindowWidth / 2,
        // y: activeDisplay.bounds.y + activeDisplay.size.height / 2 - initialWindowHeight / 2,
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

    // win.webContents.openDevTools();

    win.loadFile(join(__dirname, "../dist/index.html"));
    // win.loadURL("http://localhost:5000");

    win.webContents.on("will-navigate", e => {
        e.preventDefault();
    });
    win.webContents.setWindowOpenHandler(() => {
        return {
            action: "deny"
        }
    });

    setWindow(win);
};

app.commandLine.appendSwitch("disable-smooth-scrolling");

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed.
app.on("window-all-closed", () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (!isMac) {
        app.quit();
    }
});

function buildOpenRepoMenuItem(path: string): MenuItemConstructorOptions {
    const repoName = basename(path);
    return {
        label: `${repoName} - ${path.slice(-60 + repoName.length)}`,
        async click() {
            const result = await openRepo(path);
            if (result.opened) {
                sendEvent("repo-opened", result);
            }
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
                        if (data.target && data.source) {
                            try {
                                const clonedRepo = await Clone.clone(data.source, data.target, {
                                    fetchOpts: {
                                        callbacks: {
                                            credentials: provider.credentialsCallback
                                        }
                                    }
                                });
                                const repoResult = await openRepo(clonedRepo.workdir());
                                return sendEvent("repo-opened", repoResult);
                            } catch (err) {
                                console.warn(err);
                                if (err instanceof Error) {
                                    dialog.showErrorBox("Clone failed", err.message);
                                }
                            }
                            sendEvent("repo-opened", null);
                        }
                    }
                },
                {
                    label: "Init...",
                    async click() {
                        const data = await requestClientData(RendererRequestEvents.INIT_DIALOG, null);
                        if (data.source) {
                            const initialRepo = await Repository.init(data.source, 0);
                            const repoResult = await openRepo(initialRepo.workdir());
                            sendEvent("repo-opened", repoResult);
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
                        const result = await openRepoDialog();
                        if (result?.opened) {
                            sendEvent("repo-opened", result);
                        }
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
                        sendEvent("open-settings", null);
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
                        provider.fetchFrom(repo, null);
                    }
                },
                {
                    label: "Refresh",
                    async click() {
                        sendAction(IpcAction.REFRESH_WORKDIR, await provider.refreshWorkDir(repo, getAppConfig().diffOptions));
                    }
                },
                {
                    label: "Pull...",
                    async click() {
                        sendEvent("app-lock-ui", Locks.BRANCH_LIST);
                        await provider.pull(repo, null, signatureFromActiveProfile());
                        sendEvent("app-unlock-ui", Locks.BRANCH_LIST);
                        sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(currentRepo()));
                    }
                },
                {
                    label: "Push...",
                    async click() {
                        sendEvent("app-lock-ui", Locks.BRANCH_LIST);
                        const result = await provider.push({repo, win}, null);
                        if (result instanceof Error) {
                            dialog.showErrorBox("Failed to push", result.message);
                        } else {
                            sendAction(IpcAction.LOAD_BRANCHES, await provider.getBranches(currentRepo()));
                        }
                        sendEvent("app-unlock-ui", Locks.BRANCH_LIST);
                    }
                },
                {
                    type: "separator"
                },
                {
                    label: "Compare revisions...",
                    click() {
                        // TODO: implement with requestClientData
                        sendEvent("begin-compare-revisions", null);
                    }
                },
                {
                    label: "View commit...",
                    click() {
                        // TODO: implement with requestClientData
                        sendEvent("begin-view-commit", null);
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
                        sendAction(IpcAction.REFRESH_WORKDIR, await provider.refreshWorkDir(repo, getAppConfig().diffOptions));
                        sendAction(IpcAction.LOAD_STASHES, await provider.getStash(currentRepo()));
                        sendEvent("notify", {title: "Stashed changes"});
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
        const initData: IpcActionReturn[IpcAction.INIT] = {
            repo: null,
        };
        if (recentRepo) {
            initData.repo = await openRepo(recentRepo);
        }
        return initData;
    },
    [IpcAction.OPEN_REPO]: async (_, path) => {
        if (path) {
            return openRepo(path);
        }
        return openRepoDialog();
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
    [IpcAction.REFRESH_WORKDIR]: provider.refreshWorkDir,
    [IpcAction.GET_CHANGES]: provider.loadChanges,
    [IpcAction.STAGE_FILE]: provider.stageFile,
    [IpcAction.UNSTAGE_FILE]: provider.unstageFile,
    [IpcAction.STAGE_ALL]: provider.stageAllFiles,
    [IpcAction.UNSTAGE_ALL]: provider.unstageAllFiles,
    [IpcAction.PULL]: async (repo, data) =>  provider.pull(repo, data, signatureFromActiveProfile()),
    [IpcAction.CREATE_BRANCH]: async (repo, data) => {
        try {
            const res = await repo.createBranch(data.name, data.sha);
            if (data.checkout) {
                await repo.checkoutBranch(data.name);
            }
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
        return !!renamedRef;
    },
    [IpcAction.DELETE_REF]: provider.deleteRef,
    [IpcAction.DELETE_REMOTE_REF]: provider.deleteRemoteRef,
    [IpcAction.FIND_FILE]: provider.findFile,
    [IpcAction.ABORT_REBASE]: abortRebase,
    [IpcAction.CONTINUE_REBASE]: continueRebase,
    [IpcAction.OPEN_COMPARE_REVISIONS]: provider.tryCompareRevisions,
    [IpcAction.PUSH]: async (repo, data) => {
        return provider.push(getContext(), data);
    },
    [IpcAction.SET_UPSTREAM]: async (repo, data) => {
        const result = await provider.setUpstream(repo, data.local, data.remote);
        return !result;
    },
    [IpcAction.COMMIT]: provider.commit,
    [IpcAction.REMOTES]: provider.remotes,
    [IpcAction.RESOLVE_CONFLICT]: async (repo, {path}) => {
        const result = await provider.resolveConflict(repo, path);
        sendAction(IpcAction.REFRESH_WORKDIR, await provider.refreshWorkDir(repo, getAppConfig().diffOptions));
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

        eventReply(event, IpcAction.REMOTES, await provider.remotes(repo));
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

        eventReply(event, IpcAction.REMOTES, await provider.remotes(repo));
        eventReply(event, IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));

        return true;
    },
    [IpcAction.FETCH]: provider.fetchFrom,
    [IpcAction.SAVE_SETTINGS]: async (_, data) => {
        setCurrentProfile(data.selectedProfile);
        try {
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
        return provider.createTag(repo, data, signatureFromProfile(profile), profile.gpg?.tag ? profile.gpg.key : undefined);
    },
    [IpcAction.DELETE_TAG]: provider.deleteTag,
    [IpcAction.PARSE_REVSPEC]: async (repo, sha) => {
        const oid = await provider.parseRevspec(repo, sha);
        if (oid instanceof Error) {
            return oid;
        }
        return oid.tostrS();
    },
    [IpcAction.LOAD_STASHES]: provider.getStash,
    [IpcAction.OPEN_FILE_AT_COMMIT]: provider.openFileAtCommit,
    [IpcAction.GET_COMMIT_GPG_SIGN]: provider.getCommitGpgSign,
}

const ALLOWED_WHEN_NOT_IN_REPO = {
    [IpcAction.INIT]: true,
    [IpcAction.OPEN_REPO]: true,
    [IpcAction.GET_SETTINGS]: true,
    [IpcAction.SAVE_SETTINGS]: true,
};

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

async function abortRebase(repo: Repository): AsyncIpcActionReturnOrError<IpcAction.ABORT_REBASE> {
    const rebase = await Rebase.open(repo);
    console.log(rebase);
    // rebase.abort();
    return provider.repoStatus(repo);
}
async function continueRebase(repo: Repository): AsyncIpcActionReturnOrError<IpcAction.CONTINUE_REBASE> {
    const rebase = await Rebase.open(repo);
    console.log(rebase);
    // const rebaseAction = await rebase.next();
    // console.dir(rebaseAction);
    return provider.repoStatus(repo);
}

async function openRepoDialog() {
    sendEvent("app-lock-ui", Locks.MAIN);

    const res = await dialog.showOpenDialog({
        properties: ["openDirectory"],
        title: "Select a repository"
    });
    if (res.canceled) {
        sendEvent("app-unlock-ui", Locks.MAIN);
        return null;
    }

    const result = await openRepo(res.filePaths[0]);

    sendEvent("app-unlock-ui", Locks.MAIN);

    return result;
}

async function openRepo(repoPath: string) {
    const opened = await provider.openRepo(repoPath);

    if (opened) {
        setRepo(opened);

        addRecentRepository(repoPath);

        applyAppMenu();

        const repoProfile = await getRepoProfile(opened);

        let body;
        if (repoProfile !== false) {
            const profile = setCurrentProfile(repoProfile);
            body = `Profile set to '${profile?.profileName}'`;
        }
        sendEvent("notify", {title: "Repo opened", body});
    } else {
        dialog.showErrorBox("No repository", `'${repoPath}' does not contain a git repository`);
    }

    return {
        path: repoPath,
        opened: !!opened,
        status: opened ? provider.repoStatus(opened) : null,
    };
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
