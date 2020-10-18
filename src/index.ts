import { join } from "path";
import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron';

import * as NodeGit from "nodegit";
import { Repository, Commit, Branch, Rebase } from "nodegit";

import * as provider from "./Data/Main/Provider";
import { IpcAction, IpcActionParams, IpcActionReturn } from './Data/Actions';
import { sendEvent } from "./Data/Main/WindowEvents";
import { IpcMainEvent } from "electron/main";

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
    if (process.platform !== 'darwin') {
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

const isMac = process.platform === 'darwin'
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
                click: async () => {
                    sendEvent(win.webContents, "repo-opened", await openRepoDialog());
                }
            },
            {
                type: 'separator'
            },
            {
                label: "Preferences...",
                accelerator: 'CmdOrCtrl+,',
                click: () => {
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
                click: async () => {
                    await repo.fetchAll({
                        callbacks: {
                            credentials: provider.authenticate,
                            transferProgress: (stats: NodeGit.TransferProgress, remote: string) => {
                                sendEvent(win.webContents, "fetch-status", {
                                    // @ts-ignore
                                    receivedObjects: stats.receivedObjects(),
                                    // @ts-ignore
                                    totalObjects: stats.totalObjects(),
                                    // @ts-ignore
                                    indexedDeltas: stats.indexedDeltas(),
                                    // @ts-ignore
                                    totalDeltas: stats.totalDeltas(),
                                    // @ts-ignore
                                    indexedObjects: stats.indexedObjects(),
                                    // @ts-ignore
                                    receivedBytes: stats.receivedBytes(),
                                });
                            },
                        },
                    });
                    sendEvent(win.webContents, "repo-fetch-all");
                }
            },
            {
                label: "Refresh",
                click: () => {
                    sendEvent(win.webContents, "refresh-workdir");
                }
            },
            {
                label: 'Pull...',
                click: async () => {
                    sendEvent(win.webContents, "pull-head");
                }
            },
            {
                label: 'Push...',
                click: async () => {
                    sendEvent(win.webContents, "push-head");
                }
            },
            {
                type: "separator"
            },
            {
                label: "Compare revisions...",
                click: async() => {
                    sendEvent(win.webContents, "begin-compare-revisions");
                }
            },
            {
                label: "Blame file...",
                click: async() => {
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
                label: 'Learn More',
                click: async () => {
                    const { shell } = require('electron')
                    await shell.openExternal('https://electronjs.org')
                }
            }
        ]
    }
];
// @ts-ignore
const menu = Menu.buildFromTemplate(menuTemplate);
Menu.setApplicationMenu(menu);


let repo: Repository;

type EventArgs = {
    action: IpcAction
    data: any
};

const eventMap = {
    [IpcAction.LOAD_BRANCHES]: provider.getBranches,
    [IpcAction.LOAD_COMMIT]: provider.loadCommit,
    [IpcAction.LOAD_COMMITS]: async function *(repo: Repository, params: IpcActionParams[IpcAction.LOAD_COMMITS]) {
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
    [IpcAction.LOAD_HUNKS]: async (_: Repository, arg: IpcActionParams[IpcAction.LOAD_HUNKS]) => {
        return {
            path: arg.path,
            hunks: await loadHunks(arg)
        };
    },
    [IpcAction.CHECKOUT_BRANCH]: provider.changeBranch,
    [IpcAction.REFRESH_WORKDIR]: provider.refreshWorkDir,
    [IpcAction.GET_CHANGES]: provider.loadChanges,
    [IpcAction.STAGE_FILE]: provider.stageFile,
    [IpcAction.UNSTAGE_FILE]: provider.unstageFile,
    [IpcAction.DISCARD_FILE]: provider.discardChanges,
    [IpcAction.PULL]: provider.pull,
    [IpcAction.CREATE_BRANCH]: async (repo: Repository, data: IpcActionParams[IpcAction.CREATE_BRANCH]) => {
        return await repo.createBranch(data.name, data.sha) !== null
    },
    [IpcAction.CREATE_BRANCH_FROM_REF]: async (repo: Repository, data: IpcActionParams[IpcAction.CREATE_BRANCH_FROM_REF]) => {
        const ref = await repo.getReference(data.ref);
        const sha = ref.isTag() ? (await ref.peel(NodeGit.Object.TYPE.COMMIT)) as unknown as Commit : await repo.getReferenceCommit(data.ref);
        return await repo.createBranch(data.name, sha) !== null;
    },
    [IpcAction.DELETE_REF]: async (repo: Repository, data: IpcActionParams[IpcAction.DELETE_REF]) => {
        const ref = await repo.getReference(data.name);
        const res = Branch.delete(ref);
        return !res;
    },
    [IpcAction.DELETE_REMOTE_REF]: provider.deleteRemoteRef,
    [IpcAction.FIND_FILE]: provider.findFile,
    [IpcAction.ABORT_REBASE]: abortRebase,
    [IpcAction.CONTINUE_REBASE]: continueRebase,
    [IpcAction.OPEN_COMPARE_REVISIONS]: async (repo: Repository, data: IpcActionParams[IpcAction.OPEN_COMPARE_REVISIONS]) => {
        if (await provider.compareRevisions(repo, data)) {
            return await provider.compareRevisionsPatches();
        } else {
            return {error: "revisions not found"};
        }
    },
    [IpcAction.BLAME_FILE]: provider.blameFile,
    [IpcAction.PUSH]: async (repo: Repository, data: IpcActionParams[IpcAction.PUSH]) => {
        const result = await provider.push(repo, data);
        return !result;
    },
    [IpcAction.SET_UPSTREAM]: async (repo: Repository, data: IpcActionParams[IpcAction.SET_UPSTREAM]) => {
        const result = await provider.setUpstream(repo, data.local, data.remote);
        return !result;

    },
    [IpcAction.COMMIT]: provider.commit,
    [IpcAction.REMOTES]: provider.remotes,
}

// arg.data is typeguarded by sendAsyncMessage in IPC.ts
ipcMain.on("asynchronous-message", async (event, arg: EventArgs) => {
    const action = arg.action;
    const lock = provider.actionLock[action];
    if (lock && !lock.interuptable) {
        provider.eventReplyError(event, action, "action pending");
        return;
    }

    provider.actionLock[action] = {interuptable: false};

    if (action === IpcAction.OPEN_REPO) {
        if (arg.data) {
            const opened = await openRepo(arg.data);
            provider.eventReply(event, action, {
                path: arg.data,
                opened,
                status: opened ? repoStatus() : null,
            });
        } else {
            provider.eventReply(event, action, await openRepoDialog());
        }
    } else if (repo) {
        // TODO: fix proper type to detect AsyncIterator-stuff
        if (action === IpcAction.LOAD_COMMITS) {
            for await (const data of eventMap[action](repo, arg.data)) {
                provider.eventReply(event, action, data);
            }
        } else {
            provider.eventReply(event, action, await eventMap[action](repo, arg.data));
        }
    }
});

async function abortRebase(repo: Repository) {
    const rebase = await Rebase.open(repo);
    // rebase.abort();
    return repoStatus();
}
async function continueRebase(repo: Repository) {
    const rebase = await Rebase.open(repo);
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
        repo = await Repository.open(repoPath);
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

async function initGetComits(repo: Repository, params: IpcActionParams[IpcAction.LOAD_COMMITS]) {
    let branch: string = "HEAD";
    let revwalkStart: "refs/*" | NodeGit.Oid;
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
    } else {
        return provider.getWorkdirHunks(params.path);
    }
}
