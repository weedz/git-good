import type { OpenDialogOptions } from "electron/renderer";
import { type LoadCommitReturn } from "../../Common/Actions";
import { NativeDialog } from "../../Common/Dialog";
import { openNativeDialog } from "./IPC";

export async function selectFile(cb: (data: string) => void, options: OpenDialogOptions = {}) {
    const filePaths = await openNativeDialog(NativeDialog.OPEN_FILE, options);
    if (filePaths) {
        cb(filePaths);
    }
}

export function filterCommit(filter: string, commit: LoadCommitReturn) {
    return commit.sha.includes(filter)
        || commit.message.toLocaleLowerCase().includes(filter)
        || commit.author.email.toLocaleLowerCase().includes(filter)
        || commit.author.name.toLocaleLowerCase().includes(filter);
}
