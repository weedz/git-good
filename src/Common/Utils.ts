export const enum DiffDelta {
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
export const enum DiffOption {
    NORMAL = 0,
    REVERSE = 1,
    INCLUDE_IGNORED = 2,
    RECURSE_IGNORED_DIRS = 4,
    INCLUDE_UNTRACKED = 8,
    RECURSE_UNTRACKED_DIRS = 16,
    INCLUDE_UNMODIFIED = 32,
    INCLUDE_TYPECHANGE = 64,
    INCLUDE_TYPECHANGE_TREES = 128,
    IGNORE_FILEMODE = 256,
    IGNORE_SUBMODULES = 512,
    IGNORE_CASE = 1024,
    INCLUDE_CASECHANGE = 2048,
    DISABLE_PATHSPEC_MATCH = 4096,
    SKIP_BINARY_CHECK = 8192,
    ENABLE_FAST_UNTRACKED_DIRS = 16384,
    UPDATE_INDEX = 32768,
    INCLUDE_UNREADABLE = 65536,
    INCLUDE_UNREADABLE_AS_UNTRACKED = 131072,
    FORCE_TEXT = 1048576,
    FORCE_BINARY = 2097152,
    IGNORE_WHITESPACE = 4194304,
    IGNORE_WHITESPACE_CHANGE = 8388608,
    IGNORE_WHITESPACE_EOL = 16777216,
    SHOW_UNTRACKED_CONTENT = 33554432,
    SHOW_UNMODIFIED = 67108864,
    PATIENCE = 268435456,
    MINIMAL = 536870912,
    SHOW_BINARY = 1073741824,
}

export function getType(status: number) {
    switch (status) {
        case DiffDelta.ADDED:
            return "A";
        case DiffDelta.DELETED:
            return "D";
        case DiffDelta.MODIFIED:
            return "M";
        case DiffDelta.RENAMED:
            return "R";
        case DiffDelta.UNTRACKED:
            return "U";
        case DiffDelta.CONFLICTED:
            return "C";
    }
}

const formatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: "auto"
});

const DIVISIONS: Array<{amount: number, name: Intl.RelativeTimeFormatUnit}> = [
    { amount: 60, name: "seconds" },
    { amount: 60, name: "minutes" },
    { amount: 24, name: "hours" },
    { amount: 7, name: "days" },
    { amount: 4.34524, name: "weeks" },
    { amount: 12, name: "months" },
    { amount: Number.POSITIVE_INFINITY, name: "years" }
];

export function formatTimeAgo(date: Date) {
    let duration = (date.getTime() - new Date().getTime()) / 1000
    
    for (let i = 0; i <= DIVISIONS.length; i++) {
        const division = DIVISIONS[i]
        if (Math.abs(duration) < division.amount) {
            return formatter.format(Math.round(duration), division.name)
        }
        duration /= division.amount
    }
}
/**
 * Returns the supplied number of bytes formated as KiB/MiB/GiB with a precision of 2 decimal places
 * @param bytes 
 */
export function humanReadableBytes(bytes: number) {
    if (bytes > 1073741824) {
        return `${Math.round(bytes * 100 / 1073741824) / 100} GiB`;
    }
    if (bytes > 1048576) {
        return `${Math.round(bytes * 100 / 1048576) / 100} MiB`;
    }
    if (bytes > 1024) {
        return `${Math.round(bytes * 100 / 1024) / 100} KiB`;
    }
    return `${bytes.toString(10)} B`;
}

export function basename(pathName: string) {
    return pathName.split("/").at(-1);
}
