import { h } from "preact";
import { ContextMenu } from "../../../Common/ContextMenu";
import { openContextMenu } from "../../Data/ContextMenu";

export function showRemotesMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    openContextMenu(ContextMenu.REMOTES, {...e.currentTarget.dataset});
}
export function showRemoteMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    openContextMenu(ContextMenu.REMOTE, {...e.currentTarget.dataset});
}
export function showRemoteRefMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    openContextMenu(ContextMenu.REMOTE_REF, {...e.currentTarget.dataset});
}
export function showLocalMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    openContextMenu(ContextMenu.BRANCH_LOCAL, {...e.currentTarget.dataset});
}
export function showHeadMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    openContextMenu(ContextMenu.HEAD, {...e.currentTarget.dataset});
}
export function showTagMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    openContextMenu(ContextMenu.TAG, {...e.currentTarget.dataset});
}

export function showStashMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    openContextMenu(ContextMenu.STASH, {...e.currentTarget.dataset});
}
