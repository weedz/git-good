import { type IpcMainEvent } from "electron/main";
import { IpcAction, type IpcActionReturnOrError } from "../Common/Actions.js";
import { currentWindow } from "./Context.js";

export const actionLock: {
    [key in IpcAction]?: {
        interuptable: false
    };
} = {};

export function sendAction<T extends IpcAction>(action: T, data: IpcActionReturnOrError<T>) {
    if (data instanceof Error) {
        return currentWindow().send("asynchronous-reply", { action, error: data.toString() });
    }
    currentWindow().send("asynchronous-reply", { action, data });
}

export function eventReply<T extends IpcAction>(event: IpcMainEvent, action: T, data: IpcActionReturnOrError<T>, id?: string) {
    if (action in actionLock) {
        delete actionLock[action];
    }
    if (data instanceof Error) {
        return event.reply("asynchronous-reply", {
            action,
            error: data.toString(),
            id
        });
    }
    event.reply("asynchronous-reply", {
        action,
        data,
        id
    });
}
