import { BrowserWindow, type WebContents } from "electron/main";
import nodegit from "nodegit";

export type Context = {
    win: WebContents;
    repo: nodegit.Repository;
};


let lastKnownHead: nodegit.Oid;

const context: Context = {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    repo: null!,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    win: null!,
};

export function getLastKnownHead() {
    return lastKnownHead;
}
export function setLastKnownHead(oid: nodegit.Oid) {
    lastKnownHead = oid;
}
export function currentRepo() {
    return context.repo;
}
export function setRepo(newRepo: nodegit.Repository) {
    context.repo = newRepo;
}

export function setWindow(newWindow: BrowserWindow) {
    context.win = newWindow.webContents;
}
export function currentWindow() {
    return context.win;
}

export function getContext() {
    return context as Readonly<Context>;
}
