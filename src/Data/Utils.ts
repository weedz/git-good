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

const formatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: 'auto'
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
