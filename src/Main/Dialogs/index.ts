import { dialog, IpcMainInvokeEvent } from "electron/main";
import { IpcAction } from "../../Common/Actions";
import { NativeDialog, NativeDialogData } from "../../Common/Dialog";
import { getAppConfig } from "../Config";
import { currentRepo } from "../Context";
import { sendAction } from "../IPC";
import { discardAllChanges, discardChanges, refreshWorkDir } from "../Provider";

interface DialogData<D extends NativeDialog> {
    action: D
    data: NativeDialogData[D]
}

export async function handleDialog(_event: IpcMainInvokeEvent, eventData: DialogData<NativeDialog>) {
    if (eventData.action === NativeDialog.MESSAGE_BOX) {
        const dialogData = eventData.data as NativeDialogData[typeof eventData.action];
        return dialog.showMessageBox(dialogData);
    }

    if (eventData.action === NativeDialog.ERROR) {
        const dialogData = eventData.data as NativeDialogData[typeof eventData.action];
        return dialog.showErrorBox(dialogData.title, dialogData.content || dialogData.title);
    }

    if (eventData.action === NativeDialog.OPEN_FILE) {
        const dialogData = eventData.data as NativeDialogData[typeof eventData.action];
        const { canceled, filePaths } = await dialog.showOpenDialog(dialogData);
        if (canceled) {
            return;
        }
        return filePaths[0];
    }

    if (eventData.action === NativeDialog.DISCARD_CHANGES) {
        const dialogData = eventData.data as NativeDialogData[typeof eventData.action];
        const result = await dialog.showMessageBox({
            message: `Discard changes to "${dialogData.path}"?`,
            type: "question",
            buttons: ["Cancel", "Discard changes"],
            cancelId: 0,
        });
        if (result.response === 1) {
            await discardChanges(currentRepo(), dialogData.path);
            sendAction(IpcAction.REFRESH_WORKDIR, await refreshWorkDir(currentRepo(), getAppConfig().diffOptions));
        }
        return true;
    }

    if (eventData.action === NativeDialog.DISCARD_ALL_CHANGES) {
        const result = await dialog.showMessageBox({
            message: "Discard all changes?",
            type: "question",
            buttons: ["Cancel", "Yes"],
            cancelId: 0,
        });
        if (result.response === 1) {
            await discardAllChanges(currentRepo());
            sendAction(IpcAction.REFRESH_WORKDIR, await refreshWorkDir(currentRepo(), getAppConfig().diffOptions));
        }
        return true;
    }

}
