import { Locks } from "../Actions";
import { WindowEvents, WindowArguments } from "../WindowEventTypes";

export function sendEvent<T extends WindowEvents>(win: Electron.WebContents, event: T, args?: WindowArguments[T]) {
    win.send(event, args);
}
