import { h } from "preact";
import { ContextMenu } from "../../../Common/ContextMenu";
import { openContextMenu } from "../../Data/ContextMenu";

export function showCommitMenu(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    openContextMenu(ContextMenu.COMMIT, {...e.currentTarget.dataset});
}
