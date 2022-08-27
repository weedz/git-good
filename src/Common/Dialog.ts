// TODO: Will this work? maybe `electron/common` ?
import { MessageBoxOptions, OpenDialogOptions } from "electron"

export const enum NativeDialog {
    ERROR = 0,
    MESSAGE_BOX,
    DELETE_PROFILE,
    DISCARD_CHANGES,
    DISCARD_ALL_CHANGES,
    EDIT_REMOTE,
    OPEN_FILE
}

export type NativeDialogData = {
    [NativeDialog.ERROR]: {
        title: string
        content?: string
    }
    [NativeDialog.MESSAGE_BOX]: MessageBoxOptions
    [NativeDialog.DELETE_PROFILE]: unknown
    [NativeDialog.DISCARD_CHANGES]: {
        path: string
    }
    [NativeDialog.DISCARD_ALL_CHANGES]: unknown
    [NativeDialog.EDIT_REMOTE]: string
    [NativeDialog.OPEN_FILE]: OpenDialogOptions
} 
