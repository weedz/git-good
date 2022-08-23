import { basename, join } from "path";
import { exec, spawn } from "child_process";

import { shell, clipboard } from "electron";
import { app, BrowserWindow, ipcMain, Menu, dialog, MenuItemConstructorOptions, IpcMainEvent } from "electron/main";
import { initialize, enable as enableRemote } from "@electron/remote/main";

import { Branch, Clone, Commit, Object, Oid, Rebase, Reference, Remote, Repository, Stash } from "nodegit";

import { isMac, isWindows } from "./Main/Utils";
import { addRecentRepository, clearRepoProfile, currentProfile, getAppConfig, getRecentRepositories, getRepoProfile, saveAppConfig, setCurrentProfile, setRepoProfile, signatureFromActiveProfile, signatureFromProfile } from "./Main/Config";

import * as provider from "./Main/Provider";
import { IpcAction, IpcActionParams, IpcActionReturn, Locks, AsyncIpcActionReturnOrError } from "./Common/Actions";
import { formatTimeAgo } from "./Common/Utils";
import { requestClientData, sendEvent } from "./Main/WindowEvents";
import type { TransferProgress } from "../types/nodegit";
import { normalizeLocalName } from "./Common/Branch";

import { RendererRequestEvents } from "./Common/WindowEventTypes";

// eslint-disable-next-line import/no-unresolved
import { lastCommit, buildDateTime } from "env";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore, this is apparently a thing. Needed to set a real app_id under wayland
app.setDesktopName("git-good");

initialize();

let repo: Repository;

let win: BrowserWindow;
const createWindow = () => {
    // TODO: `screen.getCursorScreenPoint()` triggers a segfault on wayland?
    // const cursorPosition = screen.getCursorScreenPoint();
    // const activeDisplay = screen.getDisplayNearestPoint(cursorPosition);

    const initialWindowWidth = 1024;
    const initialWindowHeight = 600;


    // Create the browser window.
    win = new BrowserWindow({
        // x: activeDisplay.bounds.x + activeDisplay.size.width / 2 - initialWindowWidth / 2,
        // y: activeDisplay.bounds.y + activeDisplay.size.height / 2 - initialWindowHeight / 2,
        height: initialWindowHeight,
        width: initialWindowWidth,
        minHeight: initialWindowHeight,
        minWidth: initialWindowWidth,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            disableBlinkFeatures: "Auxclick"
        }
    });
    enableRemote(win.webContents);

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
                sendEvent(win.webContents, "repo-opened", result);
            }
        }
    }
}

function applyAppMenu() {
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
                        const data = await requestClientData(win.webContents, RendererRequestEvents.CLONE_DIALOG, null);
                        if (data.target && data.source) {
                            try {
                                const repo = await Clone.clone(data.source, data.target, {
                                    fetchOpts: {
                                        callbacks: {
                                            credentials: provider.credentialsCallback
                                        }
                                    }
                                });
                                const repoResult = await openRepo(repo.workdir());
                                return sendEvent(win.webContents, "repo-opened", repoResult);
                            } catch (err) {
                                console.warn(err);
                                if (err instanceof Error) {
                                    dialog.showErrorBox("Clone failed", err.message);
                                }
                            }
                            sendEvent(win.webContents, "repo-opened", null);
                        }
                    }
                },
                {
                    label: "Init...",
                    async click() {
                        const data = await requestClientData(win.webContents, RendererRequestEvents.INIT_DIALOG, null);
                        if (data.source) {
                            const repo = await Repository.init(data.source, 0);
                            const repoResult = await openRepo(repo.workdir());
                            sendEvent(win.webContents, "repo-opened", repoResult);
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
                            sendEvent(win.webContents, "repo-opened", result);
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
                    enabled: !!repo,
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
                        sendEvent(win.webContents, "open-settings", null);
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
                        fetchFrom(repo);
                    }
                },
                {
                    label: "Refresh",
                    click() {
                        sendEvent(win.webContents, "refresh-workdir", null);
                    }
                },
                {
                    label: "Pull...",
                    async click() {
                        sendEvent(win.webContents, "app-lock-ui", Locks.BRANCH_LIST);
                        await provider.pull(repo, null, signatureFromActiveProfile());
                        sendEvent(win.webContents, "app-unlock-ui", Locks.BRANCH_LIST);
                    }
                },
                {
                    label: "Push...",
                    async click() {
                        sendEvent(win.webContents, "app-lock-ui", Locks.BRANCH_LIST);
                        const result = await provider.push({repo, win: win.webContents}, null);
                        if (result instanceof Error) {
                            dialog.showErrorBox("Failed to push", result.message);
                        }
                        sendEvent(win.webContents, "app-unlock-ui", Locks.BRANCH_LIST);
                    }
                },
                {
                    type: "separator"
                },
                {
                    label: "Compare revisions...",
                    click() {
                        // TODO: implement with requestClientData
                        sendEvent(win.webContents, "begin-compare-revisions", null);
                    }
                },
                {
                    label: "View commit...",
                    click() {
                        // TODO: implement with requestClientData
                        sendEvent(win.webContents, "begin-view-commit", null);
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
                        sendEvent(win.webContents, "stash-changed", {
                            action: "stash"
                        });
                    }
                },
                {
                    label: "Pop latest stash",
                    async click() {
                        stashPop(repo, 0);
                    }
                },
                {
                    label: "Apply latest stash",
                    async click() {
                        stashApply(repo, 0);
                    }
                },
                {
                    label: "Drop latest stash",
                    async click() {
                        stashDrop(repo, 0);
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
                        const response = await dialog.showMessageBox(win, {
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
    [IpcAction.LOAD_COMMITS]: async (repo, params) => {
        const arg = await initGetCommits(repo, params);
        if (!arg) {
            return {commits: [], branch: "", cursor: params.cursor};
        }
        return provider.getCommits(repo, arg.branch, arg.revwalkStart, params.num);
    },
    [IpcAction.LOAD_FILE_COMMITS]: async (repo, params) => {
        const arg = await initGetCommits(repo, params);
        if (!arg) {
            return Error("Invalid params");
        }
        const result = await provider.getFileCommits(repo, arg.branch, arg.revwalkStart, params.file, params.num);
        if (!result) {
            return Error("failed to load commits");
        }
        return result;
    },
    [IpcAction.LOAD_PATCHES_WITHOUT_HUNKS]: async (_, args) => provider.getCommitPatches(args.sha, args.options),
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
    [IpcAction.DISCARD_FILE]: provider.discardChanges,
    [IpcAction.DISCARD_ALL]: provider.discardAllChanges,
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
    [IpcAction.DELETE_REF]: async (repo, data) => {
        const ref = await repo.getReference(data.name);
        const res = Branch.delete(ref);
        return !res
    },
    [IpcAction.DELETE_REMOTE_REF]: provider.deleteRemoteRef,
    [IpcAction.FIND_FILE]: provider.findFile,
    [IpcAction.ABORT_REBASE]: abortRebase,
    [IpcAction.CONTINUE_REBASE]: continueRebase,
    [IpcAction.OPEN_COMPARE_REVISIONS]: async (repo, revisions) => {
        try {
            return provider.compareRevisions(repo, revisions)
        }
        catch (err) {
            if (err instanceof Error) {
                return err;
            }
        }

        return Error("Unknown error, revisions not found?");
    },
    [IpcAction.PUSH]: async (repo, data) => {
        return provider.push({
            win: win.webContents,
            repo
        }, data);
    },
    [IpcAction.SET_UPSTREAM]: async (repo, data) => {
        const result = await provider.setUpstream(repo, data.local, data.remote);
        return !result;
    },
    [IpcAction.COMMIT]: provider.commit,
    [IpcAction.REMOTES]: provider.remotes,
    [IpcAction.RESOLVE_CONFLICT]: async (repo, {path}) => {
        const result = await provider.resolveConflict(repo, path);
        sendEvent(win.webContents, "refresh-workdir", null);
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

        await fetchFrom(repo, [await repo.getRemote(data.name)]);

        provider.eventReply(event, IpcAction.REMOTES, await provider.remotes(repo));
        provider.eventReply(event, IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));

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

        if (!await fetchFrom(repo, [remote])) {
            // Deleting remote with (possibly) invalid url
            await Remote.delete(repo, data.name);
            return false;
        }

        provider.eventReply(event, IpcAction.REMOTES, await provider.remotes(repo));
        provider.eventReply(event, IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));

        return true;
    },
    [IpcAction.REMOVE_REMOTE]: async (repo, data, event) => {
        try {
            await Remote.delete(repo, data.name);
        } catch (err) {
            return err as Error;
        }

        provider.eventReply(event, IpcAction.REMOTES, await provider.remotes(repo));
        provider.eventReply(event, IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));

        return true;
    },
    [IpcAction.FETCH]: async (repo, data) => fetchFrom(repo, data?.remote ? [await repo.getRemote(data.remote)] : undefined),
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
    [IpcAction.DELETE_TAG]: async (repo, data) => {
        if (data.remote) {
            // FIXME: Do we really need to check every remote?
            for (const remote of await repo.getRemotes()) {
                await provider.deleteRemoteTag(remote, data.name);
            }
        }

        try {
            await repo.deleteTagByName(data.name);
        } catch (err) {
            if (err instanceof Error) {
                dialog.showErrorBox("Could not delete tag", err.toString());
            }
        }

        return true;
    },
    [IpcAction.PARSE_REVSPEC]: async (repo, sha) => {
        const oid = await provider.parseRevspec(repo, sha);
        if (oid instanceof Error) {
            return oid;
        }
        return oid.tostrS();
    },
    [IpcAction.LOAD_STASHES]: provider.getStash,
    [IpcAction.STASH_POP]: stashPop,
    [IpcAction.STASH_APPLY]: stashApply,
    [IpcAction.STASH_DROP]: stashDrop,
    [IpcAction.OPEN_FILE_AT_COMMIT]: provider.openFileAtCommit,
    [IpcAction.GET_COMMIT_GPG_SIGN]: provider.getCommitGpgSign,
}

const ALLOWED_WHEN_NOT_IN_REPO = {
    [IpcAction.INIT]: true,
    [IpcAction.OPEN_REPO]: true,
    [IpcAction.GET_SETTINGS]: true,
};

ipcMain.on("asynchronous-message", async (event, arg: EventArgs) => {
    const action = arg.action;
    const lock = provider.actionLock[action];
    if (lock && !lock.interuptable) {
        provider.eventReply(event, action, Error("action pending"), arg.id);
        return;
    }

    provider.actionLock[action] = {interuptable: false};

    if (!repo && !(action in ALLOWED_WHEN_NOT_IN_REPO)) {
        provider.eventReply(event, action, Error("Not in a repository"), arg.id);
        return;
    }

    const callback = eventMap[action] as PromiseEventCallback<typeof action>;
    const data = arg.data as IpcActionParams[typeof action];
    provider.eventReply(event, action, await callback(repo, data, event), arg.id);
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
    sendEvent(win.webContents, "app-lock-ui", Locks.MAIN);

    const res = await dialog.showOpenDialog({
        properties: ["openDirectory"],
        title: "Select a repository"
    });
    if (res.canceled) {
        sendEvent(win.webContents, "app-unlock-ui", Locks.MAIN);
        return null;
    }

    const result = await openRepo(res.filePaths[0]);

    sendEvent(win.webContents, "app-unlock-ui", Locks.MAIN);

    return result;
}

async function openRepo(repoPath: string) {
    const opened = await provider.openRepo(repoPath);

    if (opened) {
        repo = opened;

        addRecentRepository(repoPath);

        applyAppMenu();

        const repoProfile = await getRepoProfile(repo);

        let body;
        if (repoProfile !== false) {
            const profile = setCurrentProfile(repoProfile);
            body = `Profile set to '${profile?.profileName}'`;
        }
        sendEvent(win.webContents, "notify", {title: "Repo opened", body});
    } else {
        dialog.showErrorBox("No repository", `'${repoPath}' does not contain a git repository`);
    }

    return {
        path: repoPath,
        opened: !!opened,
        status: opened ? provider.repoStatus(opened) : null,
    };
}

async function fetchFrom(repo: Repository, remotes?: Remote[]) {
    sendEvent(win.webContents, "fetch-status", {
        done: false,
        update: false
    });
    if (!remotes) {
        remotes = await repo.getRemotes();
    }
    let update = false;
    try {
        for (const remote of remotes) {
            await remote.fetch([], {
                prune: 1,
                callbacks: {
                    credentials: provider.credentialsCallback,
                    transferProgress: (stats: TransferProgress, remote: string) => {
                        update = true;
                        sendEvent(win.webContents, "fetch-status", {
                            remote,
                            receivedObjects: stats.receivedObjects(),
                            totalObjects: stats.totalObjects(),
                            indexedDeltas: stats.indexedDeltas(),
                            totalDeltas: stats.totalDeltas(),
                            indexedObjects: stats.indexedObjects(),
                            receivedBytes: stats.receivedBytes(),
                        });
                    },
                },
            }, "");
        }
    } catch (err) {
        if (err instanceof Error) {
            dialog.showErrorBox("Fetch failed", err.message);
        }
        sendEvent(win.webContents, "fetch-status", {
            done: true,
            update
        });
        return false;
    }
    sendEvent(win.webContents, "fetch-status", {
        done: true,
        update
    });
    return true;
}

async function initGetCommits(repo: Repository, params: IpcActionParams[IpcAction.LOAD_COMMITS] | IpcActionParams[IpcAction.LOAD_FILE_COMMITS]) {
    if (repo.isEmpty()) {
        return false;
    }
    let branch = "HEAD";
    let revwalkStart: "refs/*" | Oid;
    // FIXME: organize this...
    if ("history" in params) {
        branch = "history";
        revwalkStart = "refs/*";
    } else {
        let start: Commit | null = null;
        if ("branch" in params) {
            branch = params.branch;
        }
        try {
            if (params.cursor) {
                start = await repo.getCommit(params.cursor);
                if (!start.parentcount()) {
                    return false;
                }
                if (!params.startAtCursor) {
                    start = await start.parent(0);
                }
            }
            else if ("branch" in params) {
                if (params.branch.includes("refs/tags")) {
                    const ref = await repo.getReference(params.branch);
                    start = await ref.peel(Object.TYPE.COMMIT) as unknown as Commit;
                } else {
                    start = await repo.getReferenceCommit(params.branch);
                }
            } else if ("sha" in params) {
                start = await repo.getCommit(params.sha);
            }
        } catch (err) {
            // could not find requested ref
            console.info("initGetCommits(): could not find requested ref, using head");
        }
        if (!start) {
            start = await repo.getHeadCommit();
        }
        revwalkStart = start.id();
    }

    return {
        branch,
        revwalkStart,
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

async function stashPop(repo: Repository, index = 0) {
    await Stash.pop(repo, index);
    sendEvent(win.webContents, "stash-changed", {
        action: "pop",
        index,
    });
    return true;
}
async function stashApply(repo: Repository, index = 0) {
    await Stash.apply(repo, index);
    sendEvent(win.webContents, "stash-changed", {
        action: "apply",
        index,
    });
    return true;
}
async function stashDrop(repo: Repository, index = 0) {
    const result = await dialog.showMessageBox(win, {
        title: "Drop stash",
        message: `Are you sure you want to delete stash@{${index}}`,
        type: "question",
        buttons: ["Cancel", "Delete"],
        cancelId: 0,
    });
    if (result.response === 1) {
        await Stash.drop(repo, index);
        sendEvent(win.webContents, "stash-changed", {
            action: "drop",
            index,
        });
        return true;
    }
    return false;
}
