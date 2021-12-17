import { dialog } from "@electron/remote";
import { LoadCommitReturn } from "../Actions";

export async function selectFile(cb: (data: string) => void) {
    const result = await dialog.showOpenDialog({});
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
