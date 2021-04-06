import { Locks, IpcActionReturn, IpcAction } from "./Actions";

export type WindowEvents =
    "repo-opened" |
    "fetch-status" |
    "refresh-workdir" |
    "open-settings" |
    "app-lock-ui" |
    "app-unlock-ui" |
    "begin-compare-revisions" |
    "begin-blame-file";

export type WindowArguments = {
    "repo-opened": IpcActionReturn[IpcAction.OPEN_REPO]
    "refresh-workdir": null
    "open-settings": null
    "app-lock-ui": Locks
    "app-unlock-ui": Locks
    "begin-compare-revisions": null
    "fetch-status": {done: true} | {
        remote: string
        totalDeltas: number
        indexedDeltas: number
        receivedObjects: number
        totalObjects: number
        indexedObjects: number
        receivedBytes: number
    }
    "begin-blame-file": null
}
