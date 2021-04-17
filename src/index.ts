import { join } from "path";
import { app, BrowserWindow, ipcMain, Menu, dialog, shell, MenuItemConstructorOptions, IpcMainEvent, screen, clipboard } from "electron";
import { exec, spawn } from "child_process";

import { Branch, Commit, Object, Oid, Rebase, Reference, Remote, Repository, Signature } from "nodegit";

import * as provider from "./Data/Main/Provider";
import { IpcAction, IpcActionParams, IpcActionReturn, IpcPayloadMsg, Locks } from "./Data/Actions";
import { formatTimeAgo } from "./Data/Utils";
import { AppConfig } from "./Data/Config";
import { sendEvent } from "./Data/Main/WindowEvents";
import { TransferProgress } from "types/nodegit";
import { readFileSync, writeFileSync } from "fs";

// import { initialize } from "@electron/remote";
// initialize();

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('@electron/remote/main').initialize();

let appConfig: AppConfig;
const globalAppConfigPath = join(app.getPath("userData"), "git-good.config.json");

try {
    const configJSON = readFileSync(globalAppConfigPath).toString();
    appConfig = JSON.parse(configJSON);
} catch (err) {
    console.log("No existing config file");
}

// constants from rollup
declare const __build_date__: number;
// declare const __last_comit__: string;

const isMac = process.platform === "darwin";
// const isLinux = process.platform === "linux";
const isWindows = process.platform === "win32";

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
            nodeIntegration: true,
            enableRemoteModule: true,
            contextIsolation: false,
            worldSafeExecuteJavaScript: false,
        }
    });

    win.loadFile(join(__dirname, "../dist/index.html"));

    // win.webContents.openDevTools();
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


const menuTemplate = [
    // { role: 'appMenu' }
    ...(isMac ? [{
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
    }] : []),
    // { role: 'fileMenu' }
    {
        label: 'File',
        submenu: [
            {
                label: 'Open repository...',
                accelerator: 'CmdOrCtrl+O',
                async click() {
                    const result = await openRepoDialog();
                    if (result.opened) {
                        sendEvent(win.webContents, "repo-opened", result);
                    }
                }
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
                        // TODO: configure different terminals?
                        if (isWindows) {
                            process = exec("start cmd.exe", {
                                cwd: repo.workdir()
                            });
                        } else if (isMac) {
                            process = spawn("open", ["-a", "Terminal", "."], {
                                cwd: repo.workdir()
                            });
                        } else {
                            process = spawn("x-terminal-emulator", {
                                cwd: repo.workdir()
                            });
                        }
                        process.on("error", (err) => {
                            console.log(err);
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
                    await provider.pull(repo);
                    sendEvent(win.webContents, "app-unlock-ui", Locks.BRANCH_LIST);
                }
            },
            {
                label: 'Push...',
                async click() {
                    sendEvent(win.webContents, "app-lock-ui", Locks.BRANCH_LIST);
                    const auth = getAuth();
                    if (auth) {
                        await provider.push(repo, null, auth);
                    } else {
                        dialog.showErrorBox("Failed to push", "No git credentials");
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
] as Array<MenuItemConstructorOptions>;

const menu = Menu.buildFromTemplate(menuTemplate);
Menu.setApplicationMenu(menu);


let repo: Repository;

type EventArgs = {
    action: IpcAction
    data: IpcActionParams[IpcAction]
    id?: string
};

type AsyncGeneratorEventCallback<A extends IpcAction> = (repo: Repository, args: IpcActionParams[A], event: IpcMainEvent) => AsyncGenerator<IpcPayloadMsg<A>>;
type PromiseEventCallback<A extends IpcAction> = (repo: Repository, args: IpcActionParams[A], event: IpcMainEvent) => Promise<IpcPayloadMsg<A>>;

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
    [IpcAction.OPEN_REPO]: async (_, path) => {
        if (path) {
            const opened = await openRepo(path);
            return {
                path,
                opened,
                status: opened ? repoStatus() : null,
            }
        }
        return await openRepoDialog();
    },
    [IpcAction.LOAD_BRANCHES]: provider.getBranches,
    [IpcAction.LOAD_COMMIT]: provider.loadCommit,
    async *[IpcAction.LOAD_COMMITS](repo, params) {
        const arg = await initGetComits(repo, params);
        if (!arg) {
            yield {commits: [], branch: "", cursor: params.cursor};
        } else {
            for await (const commits of provider.getCommits(repo, arg.branch, arg.revwalkStart, params.num)) {
                yield commits;
            }
        }
    },
    [IpcAction.LOAD_FILE_COMMITS]: async (repo, params) => {
        const arg = await initGetComits(repo, params);
        if (!arg) {
            return {error: "invalid params"};
        }
        const result = await provider.getFileCommits(repo, arg.branch, arg.revwalkStart, params.file, params.num);
        if (!result) {
            return {error: "failed to load commits"};
        }
        return result;
    },
    [IpcAction.LOAD_PATCHES_WITHOUT_HUNKS]: async (_, args) => provider.getCommitPatches(args.sha, args.options),
    [IpcAction.FILE_DIFF_AT]: async (_, args) => {
        return await provider.diff_file_at_commit(repo, args.file, args.sha);
    },
    [IpcAction.LOAD_HUNKS]: async (_, arg) => {
        return {
            path: arg.path,
            hunks: await loadHunks(repo, arg)
        };
    },
    [IpcAction.CHECKOUT_BRANCH]: provider.checkoutBranch,
    [IpcAction.REFRESH_WORKDIR]: provider.refreshWorkDir,
    [IpcAction.GET_CHANGES]: provider.loadChanges,
    [IpcAction.STAGE_FILE]: async (repo, data) => {
        const result = await provider.stageFile(repo, data);
        sendEvent(win.webContents, "refresh-workdir", null);
        return result;
    },
    [IpcAction.UNSTAGE_FILE]: async (repo, data) => {
        const result = await provider.unstageFile(repo, data);
        sendEvent(win.webContents, "refresh-workdir", null);
        return result;
    },
    [IpcAction.DISCARD_FILE]: async (repo, data) => {
        const result = await provider.discardChanges(repo, data);
        sendEvent(win.webContents, "refresh-workdir", null);
        return result;
    },
    [IpcAction.PULL]: provider.pull,
    [IpcAction.CREATE_BRANCH]: async (repo, data) => {
        let res;
        try {
            res = await repo.createBranch(data.name, data.sha);
        } catch (err) {
            dialog.showErrorBox("Could not create branch", err.toString());
        }
        return {
            result: res !== null
        }
    },
    [IpcAction.CREATE_BRANCH_FROM_REF]: async (repo, data) => {
        const ref = await repo.getReference(data.ref);
        const sha = ref.isTag() ? (await ref.peel(Object.TYPE.COMMIT)) as unknown as Commit : await repo.getReferenceCommit(data.ref);
        
        let res;
        try {
            res = await repo.createBranch(data.name, sha);
        } catch (err) {
            dialog.showErrorBox("Could not create branch", err.toString());
        }
        return {
            result: res !== null
        };
    },
    // TODO: Should we allow renaming remote refs? Can we use the same call for remote refs?
    [IpcAction.RENAME_LOCAL_BRANCH]: async (repo, data) => {
        const ref = await repo.getReference(data.ref);
        let renamedRef: Reference | null = null;

        if (ref.isBranch() && !ref.isRemote()) {
            // We only allow rename of a local branch (so the name should begin with "refs/heads/")
            renamedRef = await ref.rename(`refs/heads/${data.name}`, 0, "renamed");
        }
        return {
            result: !!renamedRef
        }
    },
    [IpcAction.DELETE_REF]: async (repo, data) => {
        const ref = await repo.getReference(data.name);
        const res = Branch.delete(ref);
        return {result: !res};
    },
    [IpcAction.DELETE_REMOTE_REF]: async (repo, data) => {
        const auth = getAuth();
        if (auth) {
            return provider.deleteRemoteRef(repo, data, auth);
        }
        return {result: false};
    },
    [IpcAction.FIND_FILE]: provider.findFile,
    [IpcAction.ABORT_REBASE]: abortRebase,
    [IpcAction.CONTINUE_REBASE]: continueRebase,
    [IpcAction.OPEN_COMPARE_REVISIONS]: async (repo, data) => {
        if (await provider.compareRevisions(repo, data)) {
            return provider.compareRevisionsPatches();
        }
        return {error: "revisions not found"};
    },
    [IpcAction.PUSH]: async (repo, data) => {
        const auth = getAuth();
        const result = auth ? await provider.push(repo, data, auth) : false;
        return {result};
    },
    [IpcAction.SET_UPSTREAM]: async (repo, data) => {
        const result = await provider.setUpstream(repo, data.local, data.remote);
        return {result: !result};
    },
    [IpcAction.COMMIT]: async (repo, data) => {
        if (!appConfig.gitName || !appConfig.gitEmail) {
            return {error: "invalid name/email"};
        }
        return provider.commit(repo, data, Signature.now(appConfig.gitName, appConfig.gitEmail))
    },
    [IpcAction.REMOTES]: provider.remotes,
    [IpcAction.RESOLVE_CONFLICT]: async (_, {path}) => {
        const result = await provider.resolveConflict(path);
        sendEvent(win.webContents, "refresh-workdir", null);
        return {result: !result};
    },
    [IpcAction.EDIT_REMOTE]: async (repo, data, event) => {
        if (!Remote.isValidName(data.name)) {
            dialog.showErrorBox("Failed to edit remote", "Invalid name");
            return {result: false};
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

        return {result: true};
    },
    [IpcAction.NEW_REMOTE]: async (repo, data, event) => {
        let remote;
        try {
            remote = await Remote.create(repo, data.name, data.pullFrom);
        }
        catch(err) {
            dialog.showErrorBox("Failed to create remote", err.message);
            return {result: false};
        }

        if (data.pushTo) {
            Remote.setPushurl(repo, data.name, data.pushTo);
        }

        if (!await fetchFrom(repo, [remote])) {
            // Deleting remote with (possibly) invalid url
            await Remote.delete(repo, data.name);
            return {result: false};
        }

        provider.eventReply(event, IpcAction.REMOTES, await provider.remotes(repo));
        provider.eventReply(event, IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));

        return {result: true};
    },
    [IpcAction.REMOVE_REMOTE]: async (repo, data, event) => {
        try {
            await Remote.delete(repo, data.name);
        }
        catch(err) {
            dialog.showErrorBox("Could not remove remote", err.message);
            return {result: false};
        }

        provider.eventReply(event, IpcAction.REMOTES, await provider.remotes(repo));
        provider.eventReply(event, IpcAction.LOAD_BRANCHES, await provider.getBranches(repo));

        return {result: true};
    },
    [IpcAction.FETCH]: async (repo, data) => {
        return {result: await fetchFrom(repo, data?.remote ? [await repo.getRemote(data.remote)] : undefined)};
    },
    [IpcAction.SAVE_SETTINGS]: async (_, data) => {
        appConfig = data;
        try {
            writeFileSync(globalAppConfigPath, JSON.stringify(data));
            return {result: true};
        } catch (err) {
            dialog.showErrorBox("Failed to save settings", err.message);
        }
        return {result: false};
    },
    [IpcAction.GET_SETTINGS]: async (_, _data) => {
        return appConfig;
    }
}

ipcMain.on("asynchronous-message", async (event, arg: EventArgs) => {
    const action = arg.action;
    const lock = provider.actionLock[action];
    if (lock && !lock.interuptable) {
        provider.eventReply(event, action, {error: "action pending"}, arg.id);
        return;
    }

    provider.actionLock[action] = {interuptable: false};

    if (action !== IpcAction.OPEN_REPO && !repo) {
        provider.eventReply(event, action, {error: "Not in a repository"}, arg.id);
        return;
    }

    if (repo && repo.isEmpty()) {
        // WIP: fix handling of empty repos.
        return provider.eventReply(event, action, {error: "empty repo... FIXME"}, arg.id);
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
    return repoStatus();
}
async function continueRebase(repo: Repository): Promise<IpcActionReturn[IpcAction.CONTINUE_REBASE]> {
    const rebase = await Rebase.open(repo);
    console.log(rebase);
    // const rebaseAction = await rebase.next();
    // console.dir(rebaseAction);
    return repoStatus();
}

async function openRepoDialog() {
    const res = await dialog.showOpenDialog({
        properties: ["openDirectory"],
        title: "Select a repository"
    });

    const opened = !res.canceled && await openRepo(res.filePaths[0]);
    if (!res.canceled && !opened) {
        dialog.showErrorBox("No repository", `'${res.filePaths[0]}' does not contain a git repository`);
    }
    return {
        path: res.filePaths[0],
        opened,
        status: opened ? repoStatus() : null,
    };
}

async function openRepo(repoPath: string) {
    let opened = true;
    try {
        repo = await Repository.open(repoPath);
    } catch (e) {
        console.error(e);
        opened = false;
    }
    return opened;
}

function repoStatus() {
    return {
        empty: repo.isEmpty(),
        merging: repo.isMerging(),
        rebasing: repo.isRebasing(),
        reverting: repo.isReverting(),
        bisecting: repo.isBisecting(),
        state: repo.state(),
    };
}

async function fetchFrom(repo: Repository, remotes?: Remote[]) {
    if (!remotes) {
        remotes = await repo.getRemotes();
    }
    let update = false;
    try {
        for (const remote of remotes) {
            await remote.fetch([], {
                prune: 1,
                callbacks: {
                    credentials: (_url: string, username: string) => {
                        const auth = getAuth();
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
        dialog.showErrorBox("Fetch failed", err.message);
        return false;
    }
    sendEvent(win.webContents, "fetch-status", {
        done: true,
        update
    });
    return true;
}

async function initGetComits(repo: Repository, params: IpcActionParams[IpcAction.LOAD_COMMITS] | IpcActionParams[IpcAction.LOAD_FILE_COMMITS]) {
    let branch = "HEAD";
    let revwalkStart: "refs/*" | Oid;
    if ("history" in params) {
        branch = "history";
        revwalkStart = "refs/*";
    } else {
        let start: Commit | null = null;
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
        return provider.hunksFromCompare(params.path);
    }
    return provider.getWorkdirHunks(params.path, params.type);
}

function getAuth() {
    if (appConfig.authType === "ssh") {
        return {
            agent: appConfig.sshAgent,
            type: appConfig.authType
        }
    }
    if (appConfig.username && appConfig.password) {
        return {
            type: appConfig.authType,
            username: appConfig.username,
            password: appConfig.password,
        }
    }
    return false;
}
