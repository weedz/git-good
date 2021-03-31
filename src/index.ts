import { join } from "path";
import { app, BrowserWindow, ipcMain, Menu, dialog, shell, MenuItemConstructorOptions, IpcMainEvent, screen } from "electron";
import { spawn } from "child_process";

import { Branch, Commit, Object, Oid, Rebase, Reference, Repository } from "nodegit";

import * as provider from "./Data/Main/Provider";
import { IpcAction, IpcActionParams, IpcActionReturn, IpcActionReturnError } from "./Data/Actions";
import { sendEvent } from "./Data/Main/WindowEvents";
import { TransferProgress } from "types/nodegit";

// import { initialize } from "@electron/remote";
// initialize();

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('@electron/remote/main').initialize();


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
                click() {
                    if (repo) {
                        let process;
                        // TODO: configure different terminals?
                        if (isWindows) {
                            process = spawn("cmd.exe", {
                                cwd: repo.workdir()
                            });
                        } else if (isMac) {
                            process = spawn("open", ["-a", "."], {
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
                    sendEvent(win.webContents, "open-settings");
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
                    await repo.fetchAll({
                        prune: 1,
                        callbacks: {
                            credentials: provider.authenticate,
                            transferProgress: (stats: TransferProgress, remote: string) => {
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
                    });
                    sendEvent(win.webContents, "fetch-status", {
                        done: true
                    });
                }
            },
            {
                label: "Refresh",
                click() {
                    sendEvent(win.webContents, "refresh-workdir");
                }
            },
            {
                label: 'Pull...',
                click() {
                    sendEvent(win.webContents, "pull-head");
                }
            },
            {
                label: 'Push...',
                click() {
                    sendEvent(win.webContents, "push-head");
                }
            },
            {
                type: "separator"
            },
            {
                label: "Compare revisions...",
                click() {
                    sendEvent(win.webContents, "begin-compare-revisions");
                }
            },
            {
                label: "Blame file...",
                click() {
                    sendEvent(win.webContents, "begin-blame-file");
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
            }
        ]
    }
] as Array<MenuItemConstructorOptions>;

const menu = Menu.buildFromTemplate(menuTemplate);
Menu.setApplicationMenu(menu);


let repo: Repository;

type EventArgs = {
    action: IpcAction
    data: IpcActionParams[IpcAction]
};

type AsyncGeneratorEventCallback<A extends IpcAction> = (repo: Repository, args: IpcActionParams[A], event: IpcMainEvent) => AsyncGenerator<IpcActionReturn[A] | IpcActionReturnError>;
type PromiseEventCallback<A extends IpcAction> = (repo: Repository, args: IpcActionParams[A], event: IpcMainEvent) => Promise<IpcActionReturn[A] | IpcActionReturnError>;

type AsyncGeneratorFunctions = IpcAction.LOAD_COMMITS;

const eventMap: {
    [A in AsyncGeneratorFunctions]: AsyncGeneratorEventCallback<A>
} & {
    [A in Exclude<IpcAction, AsyncGeneratorFunctions>]: PromiseEventCallback<A>
} = {
    [IpcAction.OPEN_REPO]: async (_: Repository, path: IpcActionParams[IpcAction.OPEN_REPO]) => {
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
    async *[IpcAction.LOAD_COMMITS](repo, params: IpcActionParams[IpcAction.LOAD_COMMITS]) {
        const arg = await initGetComits(repo, params);
        if (!arg) {
            yield {commits: [], branch: "", cursor: params.cursor};
        } else {
            for await (const commits of provider.getCommits(repo, arg.branch, arg.revwalkStart, params.file, params.num)) {
                yield commits;
            }
        }
    },
    [IpcAction.LOAD_PATCHES_WITHOUT_HUNKS]: provider.getCommitPatches,
    [IpcAction.LOAD_HUNKS]: async (_, arg: IpcActionParams[IpcAction.LOAD_HUNKS]) => {
        return {
            path: arg.path,
            hunks: await loadHunks(arg)
        };
    },
    [IpcAction.CHECKOUT_BRANCH]: provider.checkoutBranch,
    [IpcAction.REFRESH_WORKDIR]: provider.refreshWorkDir,
    [IpcAction.GET_CHANGES]: provider.loadChanges,
    [IpcAction.STAGE_FILE]: provider.stageFile,
    [IpcAction.UNSTAGE_FILE]: provider.unstageFile,
    [IpcAction.DISCARD_FILE]: provider.discardChanges,
    [IpcAction.PULL]: provider.pull,
    [IpcAction.CREATE_BRANCH]: async (repo, data: IpcActionParams[IpcAction.CREATE_BRANCH]) => {
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
    [IpcAction.CREATE_BRANCH_FROM_REF]: async (repo, data: IpcActionParams[IpcAction.CREATE_BRANCH_FROM_REF]) => {
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
    [IpcAction.DELETE_REF]: async (repo, data: IpcActionParams[IpcAction.DELETE_REF]) => {
        const ref = await repo.getReference(data.name);
        const res = Branch.delete(ref);
        return {result: !res};
    },
    [IpcAction.DELETE_REMOTE_REF]: provider.deleteRemoteRef,
    [IpcAction.FIND_FILE]: provider.findFile,
    [IpcAction.ABORT_REBASE]: abortRebase,
    [IpcAction.CONTINUE_REBASE]: continueRebase,
    [IpcAction.OPEN_COMPARE_REVISIONS]: async (repo, data: IpcActionParams[IpcAction.OPEN_COMPARE_REVISIONS]) => {
        if (await provider.compareRevisions(repo, data)) {
            return provider.compareRevisionsPatches();
        }
        return {error: "revisions not found"};
    },
    [IpcAction.BLAME_FILE]: provider.blameFile,
    [IpcAction.PUSH]: async (repo, data: IpcActionParams[IpcAction.PUSH]): Promise<IpcActionReturn[IpcAction.PUSH]> => {
        const result = await provider.push(repo, data);
        return {result: !result};
    },
    [IpcAction.SET_UPSTREAM]: async (repo, data: IpcActionParams[IpcAction.SET_UPSTREAM]) => {
        const result = await provider.setUpstream(repo, data.local, data.remote);
        return {result: !result};
    },
    [IpcAction.COMMIT]: provider.commit,
    [IpcAction.REMOTES]: provider.remotes,
    [IpcAction.RESOLVE_CONFLICT]: async (repo, {path}: IpcActionParams[IpcAction.RESOLVE_CONFLICT], event) => {
        const result = await provider.resolveConflict(path);
        const refreshCallback = eventMap[IpcAction.REFRESH_WORKDIR] as PromiseEventCallback<IpcAction.REFRESH_WORKDIR>;
        provider.eventReply(event, IpcAction.REFRESH_WORKDIR, await refreshCallback(repo, null, event));
        return {result: !result};
    },
}

ipcMain.on("asynchronous-message", async (event, arg: EventArgs) => {
    const action = arg.action;
    const lock = provider.actionLock[action];
    if (lock && !lock.interuptable) {
        provider.eventReply(event, action, {error: "action pending"});
        return;
    }

    provider.actionLock[action] = {interuptable: false};

    if (action !== IpcAction.OPEN_REPO && !repo) {
        provider.eventReply(event, action, {error: "Not in a repository"});
        return;
    }

    if (repo && repo.isEmpty()) {
        // WIP: fix handling of empty repos.
        return provider.eventReply(event, action, {error: "empty repo... FIXME"});
    }

    // TODO: fix proper type to detect AsyncIterator-stuff
    if (action === IpcAction.LOAD_COMMITS) {
        const callback = eventMap[action] as AsyncGeneratorEventCallback<typeof action>;
        const data = arg.data as IpcActionParams[typeof action];
        for await (const result of callback(repo, data, event)) {
            provider.eventReply(event, action, result);
        }
    } else {
        const callback = eventMap[action] as PromiseEventCallback<typeof action>;
        const data = arg.data as IpcActionParams[typeof action];
        provider.eventReply(event, action, await callback(repo, data, event));
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

async function initGetComits(repo: Repository, params: IpcActionParams[IpcAction.LOAD_COMMITS]) {
    let branch = "HEAD";
    let revwalkStart: "refs/*" | Oid;
    if ("history" in params) {
        branch = "history";
        revwalkStart = "refs/*";
    } else {
        let start: Commit;
        if (params.cursor) {
            const lastCommit = await repo.getCommit(params.cursor);
            if (!lastCommit.parentcount()) {
                return false;
            }
            start = await lastCommit.parent(0);
        }
        else if ("branch" in params) {
            branch = params.branch;
            if (params.branch.includes("refs/tags")) {
                const ref = await repo.getReference(params.branch);
                start = await ref.peel(Object.TYPE.COMMIT) as unknown as Commit;
            } else {
                start = await repo.getReferenceCommit(params.branch);
            }
        } else {
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

function loadHunks(params: IpcActionParams[IpcAction.LOAD_HUNKS]) {
    if ("sha" in params) {
        return provider.getHunks(params.sha, params.path);
    } else if ("compare" in params) {
        return provider.hunksFromCompare(params.path);
    }
    return provider.getWorkdirHunks(params.path, params.type);
}
