import { Diff } from "nodegit";

export function getType(status: number) {
    switch (status) {
        case Diff.DELTA.ADDED:
            return "A";
        case Diff.DELTA.DELETED:
            return "D";
        case Diff.DELTA.MODIFIED:
            return "M";
        case Diff.DELTA.RENAMED:
            return "R";
        case Diff.DELTA.UNTRACKED:
            return "U";
        case Diff.DELTA.CONFLICTED:
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
