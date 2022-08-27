import { BrowserWindow, WebContents } from "electron/main";
import { Repository } from "nodegit";

export type Context = {
    win: WebContents;
    repo: Repository;
};

let repo: Repository;
let win: WebContents;

export function currentRepo() {
    return repo;
}
export function setRepo(newRepo: Repository) {
    repo = newRepo;
}

export function setWindow(newWindow: BrowserWindow) {
    win = newWindow.webContents;
}
export function currentWindow() {
    return win;
}

export function getContext() {
    return {
        repo,
        win,
    };
}
