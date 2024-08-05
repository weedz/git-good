import { type h } from "preact";
import { ContextMenu } from "../../../Common/ContextMenu.js";
import { openContextMenu } from "../../Data/ContextMenu.js";

export function showCommitMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    openContextMenu(ContextMenu.COMMIT, { ...e.currentTarget.dataset });
}
