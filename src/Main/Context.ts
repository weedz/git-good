import { BrowserWindow, type WebContents } from "electron/main";
import nodegit from "nodegit";

export type Context = {
    win: WebContents;
    repo: nodegit.Repository;
};

let repo: nodegit.Repository;
let lastKnownHead: nodegit.Oid;
let win: WebContents;

export function getLastKnownHead() {
    return lastKnownHead;
}
export function setLastKnownHead(oid: nodegit.Oid) {
    lastKnownHead = oid;
}
export function currentRepo() {
    return repo;
}
export function setRepo(newRepo: nodegit.Repository) {
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
