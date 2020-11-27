import { join } from "path";
import { app, BrowserWindow, ipcMain, Menu, dialog, shell, MenuItemConstructorOptions, IpcMainEvent } from "electron";
import { spawn } from "child_process";

import * as NodeGit from "nodegit";

import * as provider from "./Data/Main/Provider";
import { IpcAction, IpcActionParams, IpcActionReturn, IpcActionReturnError } from "./Data/Actions";
import { sendEvent } from "./Data/Main/WindowEvents";
import { TransferProgress } from "types/nodegit";

const isMac = process.platform === "darwin";
// const isLinux = process.platform === "linux";
const isWindows = process.platform === "win32";

let win: BrowserWindow;
const createWindow = () => {
    // Create the browser window.
    win = new BrowserWindow({
        height: 600,
        width: 1024,
        minHeight: 600,
        minWidth: 1024,
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
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (!isMac) {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
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
                            process = spawn("gnome-terminal", {
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


let repo: NodeGit.Repository;

type EventArgs = {
    action: IpcAction
    data: IpcActionParams[IpcAction]
};

type AsyncGeneratorEventCallback<A extends IpcAction> = (repo: NodeGit.Repository, args: IpcActionParams[A], event: IpcMainEvent) => AsyncGenerator<IpcActionReturn[A] | IpcActionReturnError>;
type PromiseEventCallback<A extends IpcAction> = (repo: NodeGit.Repository, args: IpcActionParams[A], event: IpcMainEvent) => Promise<IpcActionReturn[A] | IpcActionReturnError>;

const eventMap: {
    [A in IpcAction]: AsyncGeneratorEventCallback<A> | PromiseEventCallback<A>
} = {
    [IpcAction.OPEN_REPO]: async (_: NodeGit.Repository, path: IpcActionParams[IpcAction.OPEN_REPO]) => {
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
    async *[IpcAction.LOAD_COMMITS](repo, params: IpcActionParams[IpcAction.LOAD_COMMITS]): AsyncGenerator<IpcActionReturn[IpcAction.LOAD_COMMITS]> {
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
    [IpcAction.LOAD_HUNKS]: async (_, arg: IpcActionParams[IpcAction.LOAD_HUNKS]): Promise<IpcActionReturn[IpcAction.LOAD_HUNKS]> => {
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
    [IpcAction.CREATE_BRANCH]: async (repo, data: IpcActionParams[IpcAction.CREATE_BRANCH]): Promise<IpcActionReturn[IpcAction.CREATE_BRANCH]> => {
        return {result: await repo.createBranch(data.name, data.sha) !== null}
    },
    [IpcAction.CREATE_BRANCH_FROM_REF]: async (repo, data: IpcActionParams[IpcAction.CREATE_BRANCH_FROM_REF]): Promise<IpcActionReturn[IpcAction.CREATE_BRANCH_FROM_REF]> => {
        const ref = await repo.getReference(data.ref);
        const sha = ref.isTag() ? (await ref.peel(NodeGit.Object.TYPE.COMMIT)) as unknown as NodeGit.Commit : await repo.getReferenceCommit(data.ref);
        return {result: await repo.createBranch(data.name, sha) !== null};
    },
    [IpcAction.DELETE_REF]: async (repo, data: IpcActionParams[IpcAction.DELETE_REF]): Promise<IpcActionReturn[IpcAction.DELETE_REF]> => {
        const ref = await repo.getReference(data.name);
        const res = NodeGit.Branch.delete(ref);
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
    [IpcAction.SET_UPSTREAM]: async (repo, data: IpcActionParams[IpcAction.SET_UPSTREAM]): Promise<IpcActionReturn[IpcAction.SET_UPSTREAM]> => {
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

async function abortRebase(repo: NodeGit.Repository): Promise<IpcActionReturn[IpcAction.ABORT_REBASE]> {
    const rebase = await NodeGit.Rebase.open(repo);
    console.log(rebase);
    // rebase.abort();
    return repoStatus();
}
async function continueRebase(repo: NodeGit.Repository): Promise<IpcActionReturn[IpcAction.CONTINUE_REBASE]> {
    const rebase = await NodeGit.Rebase.open(repo);
    console.log(rebase);
    // const rebaseAction = await rebase.next();
    // console.dir(rebaseAction);
    return repoStatus();
}

async function openRepoDialog() {
    const res = await dialog.showOpenDialog({
        properties: ["openDirectory"]
    });

    const opened = !res.canceled && await openRepo(res.filePaths[0]);
    return {
        path: res.filePaths[0],
        opened,
        status: opened ? repoStatus() : null,
    };
}

async function openRepo(repoPath: string) {
    let opened = true;
    try {
        repo = await NodeGit.Repository.open(repoPath);
    } catch (e) {
        opened = false;
    }
    return opened;
}

function repoStatus() {
    return {
        merging: repo.isMerging(),
        rebasing: repo.isRebasing(),
        reverting: repo.isReverting(),
        bisecting: repo.isBisecting(),
        state: repo.state(),
    };
}

async function initGetComits(repo: NodeGit.Repository, params: IpcActionParams[IpcAction.LOAD_COMMITS]) {
    let branch = "HEAD";
    let revwalkStart: "refs/*" | NodeGit.Oid;
    if ("history" in params) {
        branch = "history";
        revwalkStart = "refs/*";
    } else {
        let start: NodeGit.Commit;
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
                const tag = await repo.getTagByName(params.branch);
                const target = tag.targetId();
                start = await repo.getCommit(target.tostrS());
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
    return provider.getWorkdirHunks(params.path);
}
