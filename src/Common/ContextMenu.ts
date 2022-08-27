export const enum ContextMenu {
    REMOTES = 0,
    REMOTE,
    REMOTE_REF,
    BRANCH_LOCAL,
    HEAD,
    TAG,
    STASH,
    COMMIT,
    FILE,
    FILE_HISTORY,
}

export type ContextMenuData = {
    [ContextMenu.REMOTES]: unknown
    [ContextMenu.REMOTE]: unknown
    [ContextMenu.REMOTE_REF]: unknown
    [ContextMenu.BRANCH_LOCAL]: unknown
    [ContextMenu.HEAD]: unknown
    [ContextMenu.TAG]: unknown
    [ContextMenu.STASH]: unknown
    [ContextMenu.COMMIT]: unknown
    [ContextMenu.FILE]: unknown
    [ContextMenu.FILE_HISTORY]: unknown
}
