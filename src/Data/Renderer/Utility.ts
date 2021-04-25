import { dialog } from "@electron/remote";

export async function selectFile(cb: (data: string) => void) {
    const result = await dialog.showOpenDialog({});
    if (!result.canceled) {
        cb(result.filePaths[0]);
    }
}
