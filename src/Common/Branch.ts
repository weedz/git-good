export const enum BranchType {
    LOCAL = 0,
    REMOTE = 1,
    ALL = 3,
}

export const enum BranchFromType {
    REF = 0,
    COMMIT = 1,
}

export const HISTORY_REF = "refs/*" as const;
export const HEAD_REF = "HEAD" as const;

/**
 * omits the "refs/remotes/" part of the name
 */
export function normalizeRemoteName(name: string) {
    return name.substring(13);
}
/**
 * omits the "refs/remotes/[REMOTE]/" part of the name
 */
export function normalizeRemoteNameWithoutRemote(name: string) {
    name = normalizeRemoteName(name);
    return name.substring(name.indexOf("/") + 1);
}

export function getRemoteName(name: string) {
    name = normalizeRemoteName(name);
    return name.substring(0, name.indexOf("/"));
}
/**
 * omits the "refs/heads/" part of the name
 */
export function normalizeLocalName(name: string) {
    return name.substring(11);
}
/**
 * omits the "refs/tags/" part of the name
 */
export function normalizeTagName(name: string) {
    return name.substring(10);
}
