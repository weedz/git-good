import { app, BrowserWindow, ipcMain } from 'electron';
import { getBranches, getCommits, getCommitWithDiff, getHunks, eventReply } from "./Data/Provider";
import { Repository, Commit } from "nodegit";
import { IPCAction, IPCActionParams, IPCActionReturn } from './Data/Actions';

declare const MAIN_WINDOW_WEBPACK_ENTRY: any;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        height: 600,
        width: 800,
        webPreferences: {
            nodeIntegration: true
        }
    });
    
    // and load the index.html of the app.
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
    
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
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

let repo: Repository;

type EventArgs = {
    action: IPCAction
    data: any
}

ipcMain.on("asynchronous-message", async (event, arg: EventArgs) => {
    if (arg.action === IPCAction.OPEN_REPO) {
        await openRepo(arg.data);
        eventReply(event, arg.action, true);
        return;
    }
    if (repo) {
        switch (arg.action) {
            case IPCAction.LOAD_BRANCHES:
                eventReply(event, arg.action, await loadBranches());
                break;
            case IPCAction.LOAD_COMMITS:
                eventReply(event, arg.action, await loadCommits(arg.data));
                break;
            case IPCAction.LOAD_COMMIT:
                eventReply(event, arg.action, await loadCommit(arg.data, event));
                break;
            case IPCAction.LOAD_HUNKS:
                const data: IPCActionReturn[IPCAction.LOAD_HUNKS] = {
                    path: arg.data.path,
                    hunks: await loadHunks(arg.data)
                };
                eventReply(event, arg.action, data);
                break;
        }
    }
});
async function openRepo(repoPath: IPCActionParams[IPCAction.OPEN_REPO]) {
    repo = await Repository.open(repoPath);
}

async function loadCommits(params: IPCActionParams[IPCAction.LOAD_COMMITS]) {
    let start: Commit;
    if ("branch" in params) {
        start = await repo.getReferenceCommit(params.branch);
    } else {
        start = await repo.getCommit(params.sha);
    }
    return await getCommits(repo, start, params.num);
}

async function loadCommit(sha: IPCActionParams[IPCAction.LOAD_COMMIT], event: Electron.IpcMainEvent) {
    // const commit = await repo.getCommit(sha);
    const commitObject = await getCommitWithDiff(repo, sha, event);
    return commitObject;
}

async function loadHunks(params: IPCActionParams[IPCAction.LOAD_HUNKS]) {
    return await getHunks(params.sha, params.path);
}

async function loadBranches() {
    return await getBranches(repo);
}
