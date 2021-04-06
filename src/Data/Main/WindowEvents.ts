import { WebContents } from "electron";
import { WindowEvents, WindowArguments } from "../WindowEventTypes";

export function sendEvent<T extends WindowEvents>(win: WebContents, event: T, args: WindowArguments[T]) {
    win.send(event, args);
}
