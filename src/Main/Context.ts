import { BrowserWindow, WebContents } from "electron/main";
import { Oid, Repository } from "nodegit";

export type Context = {
    win: WebContents;
    repo: Repository;
};

let repo: Repository;
let lastKnownHead: Oid;
let win: WebContents;

export function getLastKnownHead() {
    return lastKnownHead;
}
export function setLastKnownHead(oid: Oid) {
    lastKnownHead = oid;
}
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
