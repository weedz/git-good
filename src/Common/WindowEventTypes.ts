import type { Locks, IpcActionReturn, IpcAction } from "./Actions";
import { BranchFromType, BranchType } from "./Branch";

export type LinkTypes = "commits" | "branches" | "files";

export type WindowEvents =
    "repo-opened" |
    "notification:fetch-status" |
    "open-settings" |
    "app-lock-ui" |
    "app-unlock-ui" |
    "begin-compare-revisions" |
    "begin-view-commit" |
    "notify" |
    "notification:push-status" |
    "notification:pull-status" |
    "dialog:branch-from" |
    "dialog:create-tag" |
    "dialog:add-remote" |
    "dialog:edit-remote" |
    "dialog:rename-ref" |
    "dialog:push-tag" |
    "dialog:set-upstream" |
    "unselect-link" |
    "set-diffpane";

export type WindowArguments = {
    "repo-opened": IpcActionReturn[IpcAction.OPEN_REPO]
    "open-settings": null
    "app-lock-ui": Locks
    "app-unlock-ui": Locks
    "begin-compare-revisions": null
    "notification:fetch-status": {done: boolean, update: boolean} | {
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
    "notification:push-status": {done: boolean} | {
        totalObjects: number
        transferedObjects: number
        bytes: number
    }
    "notification:pull-status": null | {success: boolean}
    "dialog:branch-from": {
        sha: string
        type: BranchFromType
    }
    "dialog:create-tag": {
        sha: string
        fromCommit: boolean
    }
    "dialog:add-remote": unknown
    "dialog:edit-remote": {
        pullFrom?: string
        pushTo: string
        name: string
    }
    "dialog:rename-ref": {
        name: string
        type: BranchType
    }
    "dialog:push-tag": {
        name: string
    }
    "dialog:set-upstream": {
        remote: string
        local: string
    }
    "set-diffpane": string
    "unselect-link": LinkTypes
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
    id: number
    event: E
    data: RendererRequestArgs[E]
}

export type RendererResponsePayload<E extends RendererRequestEvents> = {
    id: number
    data: RendererRequestData[E]
}
