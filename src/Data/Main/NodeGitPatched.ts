/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore
import NodeGit, { Patch, Blob, DiffOptions, Utils } from "nodegit";
import { promisify } from "util";

const _fromBlobs = Patch.fromBlobs;

Patch.fromBlobs = function (old_blob: Blob, old_as_path: string, new_blob: Blob, new_as_path: string, opts: DiffOptions, cb: (patch: Patch) => void) {
    opts = Utils.normalizeOptions(opts, NodeGit.DiffOptions);

    return _fromBlobs.call(this, old_blob, old_as_path, new_blob, new_as_path, opts, cb);
};

const _Patch_fromBlobs = Patch.fromBlobs;
Patch.fromBlobs = promisify(_Patch_fromBlobs);
