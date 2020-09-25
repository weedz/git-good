import { WindowEvents, WindowArguments } from "../WindowEventTypes";

export function sendEvent<T extends WindowEvents>(win: Electron.WebContents, event: T, args: WindowArguments[T] | void) {
    win.send(event, args);
}
