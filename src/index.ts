import { join } from "path";
import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron';

import * as NodeGit from "nodegit";
import { Repository, Commit, Revwalk, Cred, Branch, Rebase } from "nodegit";

import * as provider from "./Data/Main/Provider";
import { IpcAction, IpcActionParams, IpcActionReturn, Locks } from './Data/Actions';
import { sendEvent } from "./Data/Main/WindowEvents";
import { IpcMainEvent } from "electron/main";

let win: BrowserWindow;
const createWindow = () => {
    // Create the browser window.
    win = new BrowserWindow({
        height: 600,
        width: 800,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            contextIsolation: false,
            worldSafeExecuteJavaScript: false,
        }
    });

    win.loadFile(join(__dirname, "../dist/index.html"));

    win.webContents.openDevTools();
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
                    dialog.showOpenDialog({
                        properties: ["openDirectory"]
                    }).then(async res => {
                        if (!res.canceled) {
                            const opened = await openRepo(res.filePaths[0]);
                            sendEvent(win.webContents, "repo-opened", {
                                path: res.filePaths[0],
                                opened,
                                status: opened ? repoStatus() : null,
                            });
                        }
                    });
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
                            credentials: (url: string, user: string) => {
                                const cred = Cred.sshKeyFromAgent(user);
                                return cred;
                            },
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
            { label: 'Push...' },
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

ipcMain.on("asynchronous-message", async (event, arg: EventArgs) => {
    const lock = provider.actionLock[arg.action];
    if (lock) {
        if (!lock.interuptable) {
            provider.eventReplyError(event, arg.action, "action pending");
            return;
        }
    }

    provider.actionLock[arg.action] = {interuptable: false};

    if (arg.action === IpcAction.OPEN_REPO) {
        const opened = await openRepo(arg.data);
        provider.eventReply(event, arg.action, {
            path: arg.data,
            opened,
            status: opened ? repoStatus() : null,
        });
        return;
    }

    if (repo) {
        // console.log(IpcAction[arg.action]);
        switch (arg.action) {
            case IpcAction.LOAD_BRANCHES:
                provider.eventReply(event, arg.action, await provider.getBranches(repo));
                break;
            case IpcAction.LOAD_COMMITS:
                provider.eventReply(event, arg.action, await loadCommits(event, arg.data));
                break;
            case IpcAction.LOAD_COMMIT:
                provider.eventReply(event, arg.action, await provider.commitWithDiff(repo, arg.data));
                break;
            case IpcAction.LOAD_PATCHES_WITHOUT_HUNKS:
                provider.eventReply(event, arg.action, await provider.getCommitPatches(arg.data));
                break;
            case IpcAction.LOAD_HUNKS:
                const data: IpcActionReturn[IpcAction.LOAD_HUNKS] = {
                    path: arg.data.path,
                    hunks: await loadHunks(arg.data)
                };
                provider.eventReply(event, arg.action, data);
                break;
            case IpcAction.CHECKOUT_BRANCH:
                provider.eventReply(event, arg.action, await provider.changeBranch(repo, arg.data));
                sendEvent(win.webContents, "refresh-workdir");
                break;
            case IpcAction.REFRESH_WORKDIR:
                provider.eventReply(event, arg.action, await provider.refreshWorkDir(repo));
                break;
            case IpcAction.GET_CHANGES:
                provider.eventReply(event, arg.action, provider.loadChanges());
                break;
            case IpcAction.STAGE_FILE:
                provider.eventReply(event, arg.action, await provider.stageFile(repo, arg.data));
                break;
            case IpcAction.UNSTAGE_FILE:
                provider.eventReply(event, arg.action, await provider.unstageFile(repo, arg.data));
                break;
            case IpcAction.DISCARD_FILE:
                provider.eventReply(event, arg.action, await provider.discardChanges(repo, arg.data));
                break;
            case IpcAction.PULL:
                const head = await repo.head();
                const upstream = await Branch.upstream(head);
                const result = await repo.mergeBranches(head, upstream);
                provider.eventReply(event, arg.action, !!result);
                break;
            case IpcAction.CREATE_BRANCH:
                provider.eventReply(event, arg.action, await repo.createBranch(arg.data.name, arg.data.sha) !== null);
                break;
            case IpcAction.CREATE_BRANCH_FROM_REF:
                const ref1 = await repo.getReference(arg.data.ref);
                const sha = ref1.isTag() ? (await ref1.peel(NodeGit.Object.TYPE.COMMIT)) as unknown as Commit : await repo.getReferenceCommit(arg.data.ref);
                provider.eventReply(event, arg.action, await repo.createBranch(arg.data.name, sha) !== null);
                break;
            case IpcAction.DELETE_REF:
                const ref = await repo.getReference(arg.data.name);
                const res = Branch.delete(ref);
                provider.eventReply(event, arg.action, !!res);
                break;
            case IpcAction.FIND_FILE:
                provider.eventReply(event, arg.action, await provider.findFile(repo, arg.data));
                break;
            case IpcAction.ABORT_REBASE:
                provider.eventReply(event, arg.action, await abortRebase(repo));
                break;
            case IpcAction.CONTINUE_REBASE:
                provider.eventReply(event, arg.action, await continueRebase(repo));
                break;
            case IpcAction.OPEN_COMPARE_REVISIONS:
                if (await provider.compareRevisions(repo, arg.data)) {
                    provider.eventReply(event, arg.action, await provider.compareRevisionsPatches());
                } else {
                    provider.eventReply(event, arg.action, {error: "revisions not found"});
                }
                break;
            case IpcAction.BLAME_FILE:
                provider.eventReply(event, arg.action, await provider.blameFile(repo, arg.data));
                break;
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

async function loadCommits(event: IpcMainEvent, params: IpcActionParams[IpcAction.LOAD_COMMITS]) {
    let revwalk = repo.createRevWalk();
    revwalk.sorting(Revwalk.SORT.TOPOLOGICAL | Revwalk.SORT.TIME);
    if ("history" in params) {
        revwalk.pushGlob("refs/*");
    } else {
        let start: Commit;
        if (params.cursor) {
            const lastCommit = await repo.getCommit(params.cursor);
            if (!lastCommit.parentcount()) {
                return [];
            }
            start = await lastCommit.parent(0);
        }
        else if ("branch" in params) {
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
        revwalk.push(start.id());
    }

    return await provider.getCommits(event, revwalk, repo, params.file, params.num);
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
