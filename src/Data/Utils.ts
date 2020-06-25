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
};

export function getType(status: number) {
    let type = "";
    switch (status) {
        case DELTA.ADDED:
            type = "A";
            break;
        case DELTA.DELETED:
            type = "D";
            break;
        case DELTA.MODIFIED:
            type = "M";
            break;
        case DELTA.RENAMED:
            type = "R";
            break;
        case DELTA.UNTRACKED:
            type = "U";
            break;
    }
    return type;
}
