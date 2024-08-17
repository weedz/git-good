import { dialog, type IpcMainInvokeEvent } from "electron/main";
import { NativeDialog, type NativeDialogData } from "../../Common/Dialog.js";
import { currentRepo } from "../Context.js";
import { discardAllChanges, discardChanges, sendRefreshWorkdirEvent } from "../Provider.js";

interface DialogData<D extends NativeDialog> {
    action: D;
    data: NativeDialogData[D];
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
            await sendRefreshWorkdirEvent(currentRepo());
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
            await sendRefreshWorkdirEvent(currentRepo());
        }
        return true;
    }
}
