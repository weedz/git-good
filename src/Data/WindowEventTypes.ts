import { Locks, IpcActionReturn, IpcAction } from "./Actions";

export type WindowEvents =
    "repo-opened" |
    "repo-fetch-all" |
    "refresh-workdir" |
    "open-settings" |
    "app-lock-ui" |
    "app-unlock-ui" |
    "pull-head";

export type WindowArguments = {
    "repo-opened": IpcActionReturn[IpcAction.OPEN_REPO]
    "repo-fetch-all": undefined
    "refresh-workdir": undefined
    "open-settings": undefined
    "app-lock-ui": Locks
    "app-unlock-ui": Locks
    "pull-head": undefined
}
