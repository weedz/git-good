import { h } from "preact";
import { ContextMenu } from "../../../Common/ContextMenu";
import { openContextMenu } from "../../Data/ContextMenu";

export function showFileHistoryCommitMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    openContextMenu(ContextMenu.FILE_HISTORY, {...e.currentTarget.dataset});
}
