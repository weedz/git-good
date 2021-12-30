import { basename, join } from "path";
import { exec, spawn } from "child_process";
import { app, BrowserWindow, ipcMain, Menu, dialog, shell, MenuItemConstructorOptions, IpcMainEvent, screen, clipboard } from "electron";

import { Branch, Commit, Object, Oid, Rebase, Reference, Remote, Repository, Stash } from "nodegit";

import { isMac, isWindows } from "./Data/Main/Utils";
import { addRecentRepository, clearRepoProfile, currentProfile, getAppConfig, getAuth, getRecentRepositories, getRepoProfile, saveAppConfig, setCurrentProfile, setRepoProfile, signatureFromActiveProfile, signatureFromProfile } from "./Data/Main/Config";

import * as provider from "./Data/Main/Provider";
import { IpcAction, IpcActionParams, IpcActionReturn, Locks } from "./Data/Actions";
import { formatTimeAgo } from "./Data/Utils";
import { sendEvent } from "./Data/Main/WindowEvents";
import { TransferProgress } from "../types/nodegit";
import { normalizeLocalName } from "./Data/Branch";

import { initialize, enable as enableRemote } from "@electron/remote/main";
initialize();

// constants from rollup
declare const __build_date__: number;
// declare const __last_comit__: string;

let win: BrowserWindow;
const createWindow = () => {
    const cursorPosition = screen.getCursorScreenPoint();
    const activeDisplay = screen.getDisplayNearestPoint(cursorPosition);

    const initialWindowWidth = 1024;
    const initialWindowHeight = 600;


    // Create the browser window.
    win = new BrowserWindow({
        x: activeDisplay.bounds.x + activeDisplay.size.width / 2 - initialWindowWidth / 2,
        y: activeDisplay.bounds.y + activeDisplay.size.height / 2 - initialWindowHeight / 2,
        height: initialWindowHeight,
        width: initialWindowWidth,
        minHeight: initialWindowHeight,
        minWidth: initialWindowWidth,
        webPreferences: {
            nativeWindowOpen: true,
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

app.commandLine.appendSwitch('disable-smooth-scrolling');

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
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
        // { role: 'appMenu' }
        ...isMac ? [{
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideothers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        }] : [],
        // { role: 'fileMenu' }
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open repository...',
                    accelerator: 'CmdOrCtrl+O',
                    async click() {
                        const result = await openRepoDialog();
                        if (result?.opened) {
                            sendEvent(win.webContents, "repo-opened", result);
                        }
                    }
                },
                {
                    label: "Recent...",
                    type: "submenu",
                    submenu: getRecentRepositories().map(buildOpenRepoMenuItem)
                },
                {
                    type: "separator"
                },
                {
                    label: "Open in Terminal",
                    accelerator: 'CmdOrCtrl+Shift+C',
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
                    label: "Open in File Manager",
                    click() {
                        repo && shell.openPath(repo.workdir());
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: "Preferences...",
                    accelerator: 'CmdOrCtrl+,',
                    click() {
                        sendEvent(win.webContents, "open-settings", null);
                    }
                },
                {
                    type: 'separator'
                },
                isMac ? { role: 'close' } : { role: 'quit' },
            ]
        },
        // { role: 'editMenu' }
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                ...(isMac ? [
                    { role: 'pasteAndMatchStyle' },
                    { role: 'delete' },
                    { role: 'selectAll' },
                    { type: 'separator' },
                    {
                        label: 'Speech',
                        submenu: [
                            { role: 'startspeaking' },
                            { role: 'stopspeaking' }
                        ]
                    }
                ] : [
                    { role: 'delete' },
                    { type: 'separator' },
                    { role: 'selectAll' }
                ])
            ]
        },
        // { role: 'viewMenu' }
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forcereload' },
                { role: 'toggledevtools' },
                { type: 'separator' },
                { role: 'resetzoom' },
                { role: 'zoomin' },
                { role: 'zoomout' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Repository',
            submenu: [
                {
                    label: 'Fetch all',
                    async click() {
                        if (!repo) {
                            return dialog.showErrorBox(`Error`, "Not in a repository");
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
                    label: 'Pull...',
                    async click() {
                        sendEvent(win.webContents, "app-lock-ui", Locks.BRANCH_LIST);
                        await provider.pull(repo, null, signatureFromActiveProfile());
                        sendEvent(win.webContents, "app-unlock-ui", Locks.BRANCH_LIST);
                    }
                },
                {
                    label: 'Push...',
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
                        sendEvent(win.webContents, "begin-compare-revisions", null);
                    }
                },
                {
                    label: "View commit...",
                    click() {
                        sendEvent(win.webContents, "begin-view-commit", null);
                    }
                },
            ]
        },
        {
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
        },
        // { role: 'windowMenu' }
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                ...(isMac ? [
                    { type: 'separator' },
                    { role: 'front' },
                    { type: 'separator' },
                    { role: 'window' }
                ] : [
                    { role: 'close' }
                ])
            ]
        },
        {
            role: 'help',
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
                        const buildDate = new Date(__build_date__);
                        const versionsString = `Version: ${app.getVersion()}\n` +
                            `Date: ${buildDate.toISOString()} (${formatTimeAgo(buildDate)})\n` +
                            `Commit: __last_comit__\n` +
                            `Electron: ${process.versions.electron}\n` +
                            `Chrome: ${process.versions.chrome}\n` +
                            `Node: ${process.versions.node}\n` +
                            `V8: ${process.versions.v8}\n` +
                            `OS: ${process.getSystemVersion()}`;
                        const response = await dialog.showMessageBox(win, {
                            type: "info",
                            title: "Git-good",
                            message: versionsString,
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

let repo: Repository;

type EventArgs = {
    action: IpcAction
    data: IpcActionParams[IpcAction]
    id?: string
};

type AsyncGeneratorEventCallback<A extends IpcAction> = (repo: Repository, args: IpcActionParams[A], event: IpcMainEvent) => AsyncGenerator<Error | IpcActionReturn[A]>;
type PromiseEventCallback<A extends IpcAction> = (repo: Repository, args: IpcActionParams[A], event: IpcMainEvent) => Promise<Error | IpcActionReturn[A]>;

type AsyncGeneratorFunctions = IpcAction.LOAD_COMMITS;
function isAsyncGenerator(action: IpcAction): action is AsyncGeneratorFunctions {
    // TODO: fix proper type to detect AsyncIterator-stuff, AsyncGeneratorFunctions
    return action === IpcAction.LOAD_COMMITS;
}

const eventMap: {
    [A in AsyncGeneratorFunctions]: AsyncGeneratorEventCallback<A>
} & {
    [A in Exclude<IpcAction, AsyncGeneratorFunctions>]: PromiseEventCallback<A>
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
    async *[IpcAction.LOAD_COMMITS](repo, params) {
        const arg = await initGetCommits(repo, params);
        if (!arg) {
            yield {commits: [], branch: "", cursor: params.cursor};
        } else {
            for await (const commits of provider.getCommits(repo, arg.branch, arg.revwalkStart, params.num)) {
                yield commits;
            }
        }
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
    [IpcAction.FILE_DIFF_AT]: async (repo, args) => provider.diff_file_at_commit(repo, args.file, args.sha),
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
    [IpcAction.DISCARD_FILE]: provider.discardChanges,
    [IpcAction.PULL]: async (repo, data) =>  provider.pull(repo, data, signatureFromActiveProfile()),
    [IpcAction.CREATE_BRANCH]: async (repo, data) => {
        try {
            const res = await repo.createBranch(data.name, data.sha);
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
        if (await provider.compareRevisions(repo, revisions)) {
            return provider.compareRevisionsPatches();
        }
        return Error("Revisions not found");
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
    [IpcAction.COMMIT]: async (repo, data) => {
        const profile = currentProfile();
        return await provider.commit(repo, data, signatureFromProfile(profile), profile.gpg?.commit ? profile.gpg.key : undefined);
    },
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

    if (repo && repo.isEmpty()) {
        // WIP: fix handling of empty repos.
        return provider.eventReply(event, action, Error("empty repo... FIXME"), arg.id);
    }

    if (isAsyncGenerator(action)) {
        const callback = eventMap[action] as AsyncGeneratorEventCallback<typeof action>;
        const data = arg.data as IpcActionParams[typeof action];
        for await (const result of callback(repo, data, event)) {
            provider.eventReply(event, action, result, arg.id);
        }
    } else {
        const callback = eventMap[action] as PromiseEventCallback<typeof action>;
        const data = arg.data as IpcActionParams[typeof action];
        provider.eventReply(event, action, await callback(repo, data, event), arg.id);
    }
});

async function abortRebase(repo: Repository): Promise<IpcActionReturn[IpcAction.ABORT_REBASE]> {
    const rebase = await Rebase.open(repo);
    console.log(rebase);
    // rebase.abort();
    return provider.repoStatus(repo);
}
async function continueRebase(repo: Repository): Promise<IpcActionReturn[IpcAction.CONTINUE_REBASE]> {
    const rebase = await Rebase.open(repo);
    console.log(rebase);
    // const rebaseAction = await rebase.next();
    // console.dir(rebaseAction);
    return provider.repoStatus(repo);
}

async function openRepoDialog() {
    const res = await dialog.showOpenDialog({
        properties: ["openDirectory"],
        title: "Select a repository"
    });
    if (res.canceled) {
        return null;
    }

    return openRepo(res.filePaths[0]);
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
        sendEvent(win.webContents, "notify", {title: `Repo opened`, body});
    } else {
        dialog.showErrorBox("No repository", `'${repoPath}' does not contain a git repository`);
    }

    return {
        path: repoPath,
        opened: !!opened,
        status: opened ? provider.repoStatus(repo) : null,
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
        const auth = getAuth();
        for (const remote of remotes) {
            await remote.fetch([], {
                prune: 1,
                callbacks: {
                    credentials: (_url: string, username: string) => {
                        if (auth) {
                            return provider.authenticate(username, auth);
                        }
                    },
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
    let branch = "HEAD";
    let revwalkStart: "refs/*" | Oid;
    // FIXME: organize this...
    if ("history" in params) {
        branch = "history";
        revwalkStart = "refs/*";
    } else {
        let start: Commit | null = null;
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
                branch = params.branch;
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
