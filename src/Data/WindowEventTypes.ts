import { Locks, IpcActionReturn, IpcAction } from "./Actions";

export type WindowEvents =
    "repo-opened" |
    "repo-fetch-all" |
    "fetch-status" |
    "refresh-workdir" |
    "open-settings" |
    "app-lock-ui" |
    "app-unlock-ui" |
    "pull-head" |
    "begin-compare-revisions" |
    "begin-blame-file";

export type WindowArguments = {
    "repo-opened": IpcActionReturn[IpcAction.OPEN_REPO]
    "repo-fetch-all": void
    "refresh-workdir": void
    "open-settings": void
    "app-lock-ui": Locks
    "app-unlock-ui": Locks
    "pull-head": void
    "begin-compare-revisions": void
    "fetch-status": {
        totalDeltas: number
        indexedDeltas: number
        receivedObjects: number
        totalObjects: number
        indexedObjects: number
        receivedBytes: number
    }
    "begin-blame-file": string
}
