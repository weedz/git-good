// TODO: Will this work? maybe `electron/common` ?
import { MessageBoxOptions, OpenDialogOptions } from "electron"

export const enum NativeDialog {
    ERROR = 0,
    MESSAGE_BOX,
    DISCARD_CHANGES,
    DISCARD_ALL_CHANGES,
    OPEN_FILE
}

export type NativeDialogData = {
    [NativeDialog.ERROR]: {
        title: string
        content?: string
    }
    [NativeDialog.MESSAGE_BOX]: MessageBoxOptions
    [NativeDialog.DISCARD_CHANGES]: {
        path: string
    }
    [NativeDialog.DISCARD_ALL_CHANGES]: unknown
    [NativeDialog.OPEN_FILE]: OpenDialogOptions
}

export type NativeDialogReturn = {
    [NativeDialog.ERROR]: void
    [NativeDialog.MESSAGE_BOX]: Electron.MessageBoxReturnValue
    [NativeDialog.DISCARD_CHANGES]: boolean
    [NativeDialog.DISCARD_ALL_CHANGES]: boolean
    [NativeDialog.OPEN_FILE]: string | void
}
