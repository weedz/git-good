import { DiffDelta } from "../../../Common/Utils.js";

export function getFileCssClass(status: DiffDelta) {
    switch (status) {
        case DiffDelta.MODIFIED:
            return "file-modified";
        case DiffDelta.DELETED:
            return "file-deleted";
        case DiffDelta.ADDED:
            return "file-added";
        case DiffDelta.RENAMED:
            return "file-renamed";
        case DiffDelta.UNTRACKED:
            return "file-untracked";
        case DiffDelta.CONFLICTED:
            return "file-conflicted";
        default:
            return "";
    }
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
        case DiffDelta.UNMODIFIED:
            return <>&nbsp;</>
        default:
            return ""
    }
}
