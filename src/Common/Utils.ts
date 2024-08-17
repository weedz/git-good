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

const formatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: "auto",
});

const DIVISIONS: Array<{ amount: number; name: Intl.RelativeTimeFormatUnit; }> = [
    { amount: 60, name: "seconds" },
    { amount: 60, name: "minutes" },
    { amount: 24, name: "hours" },
    { amount: 7, name: "days" },
    { amount: 4.34524, name: "weeks" },
    { amount: 12, name: "months" },
    { amount: Number.POSITIVE_INFINITY, name: "years" },
];

export function formatTimeAgo(date: Date) {
    let duration = (date.getTime() - new Date().getTime()) / 1000;
    for (let i = 0, len = DIVISIONS.length; i < len; ++i) {
        if (Math.abs(duration) < DIVISIONS[i].amount) {
            return formatter.format(Math.round(duration), DIVISIONS[i].name);
        }
        duration /= DIVISIONS[i].amount;
    }
    // NOTE: Should never reach this
    return formatter.format(Math.round(duration), "seconds");
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

export function basename(path: string) {
    return path.substring(path.lastIndexOf("/") + 1);
}
