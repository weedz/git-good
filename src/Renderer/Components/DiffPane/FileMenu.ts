import { type h } from "preact";
import { openContextMenu } from "../../Data/ContextMenu.js";
import { ContextMenu } from "../../../Common/ContextMenu.js";

export function showFileMenu(e: h.JSX.TargetedMouseEvent<HTMLLIElement>, sha?: string) {
    e.preventDefault();

    const contextData = e.currentTarget.dataset as { [name: string]: string };
    if (sha) {
        contextData.sha = sha;
    }
    openContextMenu(ContextMenu.FILE, { ...contextData });
}
