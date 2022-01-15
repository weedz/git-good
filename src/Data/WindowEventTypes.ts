import { Locks, IpcActionReturn, IpcAction } from "./Actions";

type StashChangedArguments = {
    action: "stash"
} | {
    action: "pop"
    index: number
} | {
    action: "apply"
    index: number
} | {
    action: "drop"
    index: number
};

export type WindowEvents =
    "repo-opened" |
    "fetch-status" |
    "refresh-workdir" |
    "open-settings" |
    "app-lock-ui" |
    "app-unlock-ui" |
    "begin-compare-revisions" |
    "begin-view-commit" |
    "notify" |
    "push-status" |
    "stash-changed";

export type WindowArguments = {
    "repo-opened": IpcActionReturn[IpcAction.OPEN_REPO]
    "refresh-workdir": null
    "open-settings": null
    "app-lock-ui": Locks
    "app-unlock-ui": Locks
    "begin-compare-revisions": null
    "fetch-status": {done: boolean, update: boolean} | {
        remote: string
        totalDeltas: number
        indexedDeltas: number
        receivedObjects: number
        totalObjects: number
        indexedObjects: number
        receivedBytes: number
    }
    "begin-view-commit": null
    "notify": NotificationInit
    "push-status": {done: boolean} | {
        totalObjects: number
        transferedObjects: number
        bytes: number
    }
    "stash-changed": StashChangedArguments
}

export enum NotificationPosition {
    DEFAULT,
}

export type NotificationInit = {
    position?: NotificationPosition
    title: string
    body?: null | string
    time?: number
    classList?: string[]
}

export const enum RendererRequestEvents {
    CLONE_DIALOG = 0,
    INIT_DIALOG,
}

export type RendererRequestArgs = {
    [RendererRequestEvents.CLONE_DIALOG]: null
    [RendererRequestEvents.INIT_DIALOG]: null
}

export type RendererRequestData = {
    [RendererRequestEvents.CLONE_DIALOG]: {
        source: string
        target: string
    }
    [RendererRequestEvents.INIT_DIALOG]: {
        source: string
    }
}

export type RendererRequestPayload<E extends RendererRequestEvents> = {
    id: string
    event: E
    data: RendererRequestArgs[E]
}

export type RendererResponsePayload<E extends RendererRequestEvents> = {
    id: string
    data: RendererRequestData[E]
}
