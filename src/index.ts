import { app, BrowserWindow, ipcMain } from 'electron';
import { getBranches, getCommits, getCommitWithDiff } from "./Data/Provider";
import { Repository } from "nodegit";
import { IPCAction } from './Data/Actions';

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

ipcMain.on("asynchronous-message", async (event, arg) => {
    switch (arg.action) {
        case IPCAction.OPEN_REPO:
            await openRepo(arg.data);
            event.reply("asynchronous-reply", {
                action: arg.action,
                data: true
            });
            break;
        case IPCAction.LOAD_BRANCHES:
            event.reply("asynchronous-reply", {
                action: arg.action,
                data: await loadBranches()
            });
            break;
        case IPCAction.LOAD_COMMITS:
            event.reply("asynchronous-reply", {
                action: arg.action,
                data: await loadCommits(arg.data)
            });
            break;
        case IPCAction.LOAD_COMMIT:
            event.reply("asynchronous-reply", {
                action: arg.action,
                data: await loadCommit(arg.data, event)
            });
            break;
    }
});
async function openRepo(repoPath: string) {
    repo = await Repository.open(repoPath);
}
export type LoadCommitsReturn = {
    sha: string;
    message: string;
    date: number;
    author: {
        name: string;
        email: string;
    };
}[];
async function loadCommits(params: any): Promise<LoadCommitsReturn | undefined> {
    if (repo) {
        let start;
        if (params.branch) {
            start = await repo.getReferenceCommit(params.branch);
        } else if (params.commit) {
            start = await repo.getCommit(params.commit);
        }
        return await getCommits(repo, start, params.num);
    }
}

async function loadCommit(sha: string, event: Electron.IpcMainEvent) {
    if (repo) {
        // const commit = await repo.getCommit(sha);
        const commitObject = await getCommitWithDiff(repo, sha, event);
        return commitObject;
    }
}

async function loadBranches() {
    if (repo) {
        return await getBranches(repo);
    }
}
