import type { OpenDialogOptions } from "electron/renderer";
import { LoadCommitReturn } from "../../Common/Actions";
import { NativeDialog } from "../../Common/Dialog";
import { openNativeDialog } from "./Dialogs";

export async function selectFile(cb: (data: string) => void, options: OpenDialogOptions = {}) {
    const result = await openNativeDialog(NativeDialog.OPEN_FILE, options);
    if (!result.canceled) {
        cb(result.filePaths[0]);
    }
}

export function filterCommit(filter: string, commit: LoadCommitReturn) {
    return commit.sha.includes(filter)
        || commit.message.toLocaleLowerCase().includes(filter)
        || commit.author.email.toLocaleLowerCase().includes(filter)
        || commit.author.name.toLocaleLowerCase().includes(filter);
}
