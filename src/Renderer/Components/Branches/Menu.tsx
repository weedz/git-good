import { ContextMenu } from "../../../Common/ContextMenu.js";
import { openContextMenu } from "../../Data/ContextMenu.js";

export function showRemotesMenu(e: preact.TargetedMouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  openContextMenu(ContextMenu.REMOTES, e.currentTarget.dataset);
}
export function showRemoteMenu(e: preact.TargetedMouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  openContextMenu(ContextMenu.REMOTE, e.currentTarget.dataset);
}
export function showRemoteRefMenu(e: preact.TargetedMouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  openContextMenu(ContextMenu.REMOTE_REF, e.currentTarget.dataset);
}
export function showLocalMenu(e: preact.TargetedMouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  openContextMenu(ContextMenu.BRANCH_LOCAL, e.currentTarget.dataset);
}
export function showHeadMenu(e: preact.TargetedMouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  openContextMenu(ContextMenu.HEAD, e.currentTarget.dataset);
}
export function showTagMenu(e: preact.TargetedMouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  openContextMenu(ContextMenu.TAG, e.currentTarget.dataset);
}

export function showStashMenu(e: preact.TargetedMouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  openContextMenu(ContextMenu.STASH, e.currentTarget.dataset);
}
