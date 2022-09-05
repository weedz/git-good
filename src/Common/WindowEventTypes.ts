import type { Locks, RepoStatus } from "./Actions";
import { BranchFromType, BranchType } from "./Branch";

export type LinkTypes = "commits" | "branches" | "files";

export const enum AppEventType {
    REPO_OPENED = 0,
    OPEN_SETTINGS,
    LOCK_UI,
    UNLOCK_UI,
    BEGIN_COMPARE_REVISIONS,
    BEGIN_VIEW_COMMIT,
    UNSELECT_LINK,
    SET_DIFFPANE,
    NOTIFY,
    NOTIFY_FETCH_STATUS,
    NOTIFY_PUSH_STATUS,
    DIALOG_BRANCH_FROM,
    DIALOG_CREATE_TAG,
    DIALOG_ADD_REMOTE,
    DIALOG_EDIT_REMOTE,
    DIALOG_RENAME_REF,
    DIALOG_PUSH_TAG,
    DIALOG_SET_UPSTREAM,
}

export type AppEventData = {
    [AppEventType.REPO_OPENED]: {
        opened: boolean
        path: string
        status: RepoStatus
    }
    [AppEventType.OPEN_SETTINGS]: null
    [AppEventType.LOCK_UI]: Locks
    [AppEventType.UNLOCK_UI]: Locks
    [AppEventType.BEGIN_COMPARE_REVISIONS]: null
    [AppEventType.BEGIN_VIEW_COMMIT]: null
    [AppEventType.UNSELECT_LINK]: LinkTypes
    [AppEventType.SET_DIFFPANE]: string
    [AppEventType.NOTIFY]: NotificationInit
    [AppEventType.BEGIN_COMPARE_REVISIONS]: null
    [AppEventType.NOTIFY_FETCH_STATUS]: {done: boolean, update: boolean} | {
        remote: string
        totalDeltas: number
        indexedDeltas: number
        receivedObjects: number
        totalObjects: number
        indexedObjects: number
        receivedBytes: number
    }
    [AppEventType.NOTIFY_PUSH_STATUS]: {done: boolean} | {
        totalObjects: number
        transferedObjects: number
        bytes: number
    }
    [AppEventType.DIALOG_BRANCH_FROM]: {
        sha: string
        type: BranchFromType
    }
    [AppEventType.DIALOG_CREATE_TAG]: {
        sha: string
        fromCommit: boolean
    }
    [AppEventType.DIALOG_ADD_REMOTE]: unknown
    [AppEventType.DIALOG_EDIT_REMOTE]: {
        pullFrom: string
        pushTo: string
        name: string
    }
    [AppEventType.DIALOG_RENAME_REF]: {
        name: string
        type: BranchType
    }
    [AppEventType.DIALOG_PUSH_TAG]: {
        name: string
    }
    [AppEventType.DIALOG_SET_UPSTREAM]: {
        remote: string
        local: string
    }
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
