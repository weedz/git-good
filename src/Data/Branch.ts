import { BranchObj, BranchesObj } from "./Actions";

export function normalizeRemoteName(name: string) {
    // omits the "refs/remotes/" part of the name
    return name.substring(13);
}
export function normalizeLocalName(name: string) {
    // omits the "refs/heads/" part of the name
    return name.substring(11);
}
export function normalizeTagName(name: string) {
    // omits the "refs/tags/" part of the name
    return name.substring(10);
}
