import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron';
import { join } from "path";
import { getBranches, getCommits, getCommitWithDiff, getHunks, eventReply } from "./Data/Provider";
import { Repository, Commit, Object, Revwalk, Cred } from "nodegit";
import { IpcAction, IpcActionParams, IpcActionReturn } from './Data/Actions';
import { readFileSync } from 'fs';

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

    // mainWindow.webContents.openDevTools();
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
                            win.webContents.send("repo-opened", {
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
                    // FIXME: make this configurable
                    const username = "git";
                    const publickey = readFileSync("/Users/linusbjorklund/.ssh/id_rsa.pub").toString();
                    const privatekey = readFileSync("/Users/linusbjorklund/.ssh/id_rsa").toString();
                    // const passphrase = "PASSPHRASE";
                    const cred = await Cred.sshKeyMemoryNew(username, publickey, privatekey, "");

                    await repo.fetchAll({
                        callbacks: {
                            credentials: (url: any, user: any) => {
                                // console.log(`Fetch required credentials. url: ${url}, user: ${user}`);
                                return cred;
                            }
                        }
                    });
                    win.webContents.send("repo-fetch-all");
                }
            },
            { label: 'Pull...' },
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
            case IpcAction.LOAD_COMMIT_HISTORY:
                eventReply(event, arg.action, await loadCommitHistory(arg.data));
                break;
            case IpcAction.LOAD_COMMIT:
                eventReply(event, arg.action, await loadCommit(arg.data, event));
                break;
            case IpcAction.LOAD_HUNKS:
                const data: IpcActionReturn[IpcAction.LOAD_HUNKS] = {
                    path: arg.data.path,
                    hunks: await loadHunks(arg.data)
                };
                eventReply(event, arg.action, data);
                break;
            case IpcAction.CHECKOUT_BRANCH:
                eventReply(event, arg.action, await changeBranch(arg.data));
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
        console.warn(e);
    }
    return opened;
}

async function loadCommitHistory(params: IpcActionParams[IpcAction.LOAD_COMMIT_HISTORY]) {
    const revwalk = repo.createRevWalk();
    revwalk.sorting(Revwalk.SORT.TIME);
    revwalk.pushGlob("refs/*");
    
    const commits = await revwalk.getCommits(params.num || 100);
    
    return commits.map(commit => ({
        sha: commit.sha(),
        message: commit.message(),
        date: commit.date().getTime(),
        author: {
            name: commit.author().name(),
            email: commit.author().email(),
        }
    }));
}

async function loadCommits(params: IpcActionParams[IpcAction.LOAD_COMMITS]) {
    let start: Commit;
    if ("branch" in params) {
        start = await repo.getReferenceCommit(params.branch);
    } else {
        start = await repo.getCommit(params.sha);
    }
    return await getCommits(repo, start, params.num);
}

function loadCommit(sha: IpcActionParams[IpcAction.LOAD_COMMIT], event: Electron.IpcMainEvent) {
    return getCommitWithDiff(repo, sha, event);
}

function loadHunks(params: IpcActionParams[IpcAction.LOAD_HUNKS]) {
    return getHunks(params.sha, params.path);
}

function loadBranches() {
    return getBranches(repo);
}

async function changeBranch(branch: string) {
    try {
        await repo.checkoutBranch(branch);
        const head = await repo.head();
        const headCommit = await head.peel(Object.TYPE.COMMIT);
        return {
            name: head.name(),
            headSHA: headCommit.id().tostrS(),
            normalizedName: head.name(),
        };
    } catch(err) {
        console.log(err);
        return false;
    }
}
