import { join } from "path";
import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron';
import { Repository, Commit, Revwalk, Cred, Branch } from "nodegit";
import { getBranches, getCommits, getCommitWithDiff, getHunks, eventReply, actionLock, getCommitPatches, eventReplyError, loadChanges, getWorkdirHunks, refreshWorkDir, stageFile, unstageFile, discardChanges, changeBranch } from "./Data/Main/Provider";
import { IpcAction, IpcActionParams, IpcActionReturn, Locks } from './Data/Actions';
import { readFileSync } from "fs";
import { sendEvent } from "./Data/Main/WindowEvents";

let win: BrowserWindow;
const createWindow = () => {
    // Create the browser window.
    win = new BrowserWindow({
        height: 600,
        width: 800,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
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
                            sendEvent(win.webContents, "repo-opened", {
                                path: res.filePaths[0],
                                opened: await openRepo(res.filePaths[0])
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
                    sendEvent(win.webContents, "app-lock-ui", Locks.MAIN);

                    // FIXME: make this configurable
                    // const username = "git";
                    // const publickey = readFileSync("/Users/linusbjorklund/.ssh/id_rsa.pub").toString();
                    // const privatekey = readFileSync("/Users/linusbjorklund/.ssh/id_rsa").toString();
                    // const passphrase = "";
                    // const cred = await Cred.sshKeyMemoryNew(username, publickey, privatekey, passphrase);
                    
                    await repo.fetchAll({
                        callbacks: {
                            credentials: (url: any, user: any) => {
                                const cred = Cred.sshKeyFromAgent(user);
                                return cred;
                            }
                        }
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
    const lock = actionLock[arg.action];
    if (lock) {
        if (!lock.interuptable) {
            eventReplyError(event, arg.action, "action pending");
            return;
        }
    }

    actionLock[arg.action] = {interuptable: false};

    if (arg.action === IpcAction.OPEN_REPO) {
        eventReply(event, arg.action, {
            path: arg.data,
            opened: await openRepo(arg.data)
        });
        return;
    }

    if (repo) {
        switch (arg.action) {
            case IpcAction.LOAD_BRANCHES:
                eventReply(event, arg.action, await loadBranches());
                break;
            case IpcAction.LOAD_COMMITS:
                eventReply(event, arg.action, await loadCommits(arg.data));
                break;
            case IpcAction.LOAD_COMMIT:
                eventReply(event, arg.action, await loadCommit(arg.data));
                break;
            case IpcAction.LOAD_PATCHES_WITHOUT_HUNKS:
                eventReply(event, arg.action, await loadPatches(arg.data));
                break;
            case IpcAction.LOAD_HUNKS:
                const data: IpcActionReturn[IpcAction.LOAD_HUNKS] = {
                    path: arg.data.path,
                    hunks: await loadHunks(arg.data)
                };
                eventReply(event, arg.action, data);
                break;
            case IpcAction.CHECKOUT_BRANCH:
                eventReply(event, arg.action, await changeBranch(repo, arg.data));
                sendEvent(win.webContents, "refresh-workdir");
                break;
            case IpcAction.REFRESH_WORKDIR:
                eventReply(event, arg.action, await refreshWorkDir(repo));
                break;
            case IpcAction.GET_CHANGES:
                eventReply(event, arg.action, loadChanges());
                break;
            case IpcAction.STAGE_FILE:
                eventReply(event, arg.action, await stageFile(repo, arg.data));
                break;
            case IpcAction.UNSTAGE_FILE:
                eventReply(event, arg.action, await unstageFile(repo, arg.data));
                break;
            case IpcAction.DISCARD_FILE:
                eventReply(event, arg.action, await discardChanges(repo, arg.data));
                break;
            case IpcAction.PULL:
                const head = await repo.head();
                const upstream = await Branch.upstream(head);
                const result = await repo.mergeBranches(head, upstream);
                eventReply(event, arg.action, !!result);
                break;
        }
    }
});

async function openRepo(repoPath: string) {
    let opened = true;
    try {
        repo = await Repository.open(repoPath);
    } catch (e) {
        opened = false;
    }
    return opened;
}

async function loadCommits(params: IpcActionParams[IpcAction.LOAD_COMMITS]) {
    let start: Commit | false = false;
    let revwalk = repo.createRevWalk();
    revwalk.sorting(Revwalk.SORT.TOPOLOGICAL | Revwalk.SORT.TIME);
    if ("history" in params) {
        revwalk.pushGlob("refs/*");
    } else {
        if ("branch" in params) {
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

    return await getCommits(revwalk, params.file, params.num);
}

function loadCommit(sha: IpcActionParams[IpcAction.LOAD_COMMIT]) {
    return getCommitWithDiff(repo, sha);
}
function loadPatches(sha: IpcActionParams[IpcAction.LOAD_PATCHES_WITHOUT_HUNKS]) {
    return getCommitPatches(sha);
}

function loadHunks(params: IpcActionParams[IpcAction.LOAD_HUNKS]) {
    if ("sha" in params) {
        return getHunks(params.sha, params.path);
    } else {
        return getWorkdirHunks(params.path);
    }
}

function loadBranches() {
    return getBranches(repo);
}
