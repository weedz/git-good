export enum DELTA {
    UNMODIFIED = 0,
    ADDED = 1,
    DELETED = 2,
    MODIFIED = 3,
    RENAMED = 4,
    COPIED = 5,
    IGNORED = 6,
    UNTRACKED = 7,
    TYPECHANGE = 8,
    UNREADABLE = 9,
    CONFLICTED = 10,
}

export function getType(status: number) {
    switch (status) {
        case DELTA.ADDED:
            return "A";
        case DELTA.DELETED:
            return "D";
        case DELTA.MODIFIED:
            return "M";
        case DELTA.RENAMED:
            return "R";
        case DELTA.UNTRACKED:
            return "U";
        case DELTA.CONFLICTED:
            return "C";
    }
}
