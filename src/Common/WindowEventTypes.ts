import type { Locks, PatchObj, RepoStatus } from "./Actions.js";
import { BranchFromType, BranchType } from "./Branch.js";

export const enum LinkTypes {
    COMMITS = 0,
    BRANCHES,
    FILES,
}

export const enum AppEventType {
    REPO_OPENED = 0,
    OPEN_SETTINGS,
    LOCK_UI,
    UNLOCK_UI,
    UNSELECT_LINK,
    SET_DIFFPANE,
    NOTIFY,
    NOTIFY_FETCH_STATUS,
    NOTIFY_PUSH_STATUS,
    NOTIFY_CLONE_STATUS,
    DIALOG_BRANCH_FROM,
    DIALOG_CREATE_TAG,
    DIALOG_ADD_REMOTE,
    DIALOG_EDIT_REMOTE,
    DIALOG_RENAME_REF,
    DIALOG_PUSH_TAG,
    DIALOG_SET_UPSTREAM,
    REFRESH_WORKDIR,
    OPEN_COMPARE_REVISIONS,
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
    [AppEventType.UNSELECT_LINK]: LinkTypes
    [AppEventType.SET_DIFFPANE]: string
    [AppEventType.NOTIFY]: NotificationInit
    [AppEventType.NOTIFY_FETCH_STATUS]: {
        remote: string;
        init: true;
    } | {
        remote: string;
        done: boolean;
        update: boolean;
    } | {
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
    [AppEventType.NOTIFY_CLONE_STATUS]: {
        done: false
    } | {
        done: true
        source: string
        target: string
    } | {
        totalDeltas: number
        indexedDeltas: number
        receivedObjects: number
        totalObjects: number
        indexedObjects: number
        receivedBytes: number
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
    [AppEventType.REFRESH_WORKDIR]: {
        unstaged: number
        staged: number
        status: RepoStatus
    }
    [AppEventType.OPEN_COMPARE_REVISIONS]: PatchObj[]
}

export const enum NotificationPosition {
    DEFAULT = 0,
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
    FILE_HISTORY_DIALOG,
    GET_COMMIT_SHA_DIALOG,
    COMPARE_REVISIONS_DIALOG
}

export type RendererRequestArgs = {
    [RendererRequestEvents.CLONE_DIALOG]: null
    [RendererRequestEvents.INIT_DIALOG]: null
    [RendererRequestEvents.FILE_HISTORY_DIALOG]: null
    [RendererRequestEvents.GET_COMMIT_SHA_DIALOG]: null
    [RendererRequestEvents.COMPARE_REVISIONS_DIALOG]: null
}

export type RendererRequestData = {
    [RendererRequestEvents.CLONE_DIALOG]: {
        source: string
        target: string
    }
    [RendererRequestEvents.INIT_DIALOG]: {
        source: string
    }
    [RendererRequestEvents.FILE_HISTORY_DIALOG]: string
    [RendererRequestEvents.GET_COMMIT_SHA_DIALOG]: string
    [RendererRequestEvents.COMPARE_REVISIONS_DIALOG]: {
        from: string
        to: string
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
