import { ContextMenu } from "../../../Common/ContextMenu.js";
import { openContextMenu } from "../../Data/ContextMenu.js";

export function showFileHistoryCommitMenu(e: preact.TargetedMouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  openContextMenu(ContextMenu.FILE_HISTORY, e.currentTarget.dataset);
}
