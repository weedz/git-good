import { join } from "path";
import * as fs from "fs/promises";
import { tmpdir } from "os";
import { dialog, IpcMainEvent, shell, WebContents } from "electron";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore, missing declations for Credential
import { Revparse, Credential, Repository, Revwalk, Commit, Diff, ConvenientPatch, ConvenientHunk, DiffLine, Object, Branch, Graph, Index, Reset, Checkout, DiffFindOptions, Reference, Oid, Signature, Remote, DiffOptions, IndexEntry, Error as NodeGitError, Tag, Stash, Status } from "nodegit";
import { IpcAction, BranchObj, LineObj, HunkObj, PatchObj, CommitObj, IpcActionParams, RefType, StashObj, AsyncIpcActionReturnOrError, IpcActionReturnOrError, IpcActionReturn } from "../Common/Actions";
import { normalizeLocalName, normalizeRemoteName, normalizeRemoteNameWithoutRemote, normalizeTagName, remoteName } from "../Common/Branch";
import { gpgSign, gpgVerify } from "./GPG";
import { AuthConfig } from "../Common/Config";
import { currentProfile, getAppConfig, getAuth, signatureFromProfile } from "./Config";
import { sendEvent } from "./WindowEvents";

export type Context = {
    win: WebContents;
    repo: Repository;
};

export const actionLock: {
    [key in IpcAction]?: {
        interuptable: false
    };
} = {};

export function eventReply<T extends IpcAction>(event: IpcMainEvent, action: T, data: IpcActionReturnOrError<T>, id?: string) {
    if (action in actionLock) {
        delete actionLock[action];
    }
    if (data instanceof Error) {
        return event.reply("asynchronous-reply", {
            action,
            error: data.toString(),
            id
        });
    }
    event.reply("asynchronous-reply", {
        action,
        data,
        id
    });
}

export function authenticate(username: string, auth: AuthConfig) {
    if (auth.authType === "ssh") {
        if (auth.sshAgent) {
            return Credential.sshKeyFromAgent(username || "git");
        }
        return Credential.sshKeyNew(username, auth.sshPublicKey, auth.sshPrivateKey, auth.sshPassphrase || "");
    } else if (auth.authType === "userpass") {
        return Credential.userpassPlaintextNew(auth.username, auth.password);
    }
}
export function credentialsCallback(_url: string, username: string) {
    const auth = getAuth();
    if (auth) {
        return authenticate(username, auth);
    }
}

export async function openRepo(repoPath: string) {
    try {
        const repo = await Repository.open(repoPath);
        index = await repo.refreshIndex();
        return repo;
    } catch (e) {
        return false;
    }
}

export function repoStatus(repo: Repository) {
    return {
        empty: repo.isEmpty(),
        merging: repo.isMerging(),
        rebasing: repo.isRebasing(),
        reverting: repo.isReverting(),
        bisecting: repo.isBisecting(),
        state: repo.state(),
    };
}

type HistoryCommit = {
    parents: string[]
    sha: string,
    message: string,
    date: number,
    author: {
        name: string,
        email: string,
    },
    path?: string
    status?: number
}
function compileHistoryCommit(commit: Commit): HistoryCommit {
    const author = commit.author();
    return {
        parents: commit.parents().map(oid => oid.tostrS()),
        sha: commit.sha(),
        message: commit.message(),
        date: commit.date().getTime(),
        author: {
            name: author.name(),
            email: author.email(),
        }
    };
}

function initRevwalk(repo: Repository, start: "refs/*" | Oid) {
    const revwalk = repo.createRevWalk();
    if (getAppConfig().commitlistSortOrder === "topological") {
        revwalk.sorting(Revwalk.SORT.TOPOLOGICAL | Revwalk.SORT.TIME);
    }

    if (start === "refs/*") {
        revwalk.pushGlob(start);
    } else {
        revwalk.push(start);
    }
    return revwalk;
}

export async function getFileCommits(repo: Repository, branch: string, start: "refs/*" | Oid, file: string, num = 50000) {
    const revwalk = initRevwalk(repo, start);

    let followRenames = false;

    let currentName = file;
    // FIXME: HistoryEntry should set commit.repo.
    const historyEntries = await revwalk.fileHistoryWalk(currentName, num);

    if (historyEntries[0].status === Diff.DELTA.RENAMED) {
        // We always "follow renames" if the file is renamed in the first commit
        followRenames = true;
    }

    const commits: IpcActionReturn[IpcAction.LOAD_FILE_COMMITS]["commits"] = [];

    fileHistoryCache.clear();

    for (const entry of historyEntries) {
        const commit = entry.commit;
        const historyCommit = compileHistoryCommit(entry.commit);
        historyCommit.status = entry.status;

        historyCommit.path = currentName;

        if (entry.status === Diff.DELTA.RENAMED) {
            historyCommit.path = entry.oldName;
        }

        if (entry.status === Diff.DELTA.RENAMED && followRenames) {
            followRenames = false;

            historyCommit.path = entry.newName;

            currentName = entry.oldName;
        }

        commits.push(historyCommit as HistoryCommit & { path: string });

        if (!entry.oldName) {
            entry.oldName = currentName;
        }
        fileHistoryCache.set(commit.sha(), entry);
    }

    return {
        cursor: historyEntries[historyEntries.length - 1]?.commit.sha(),
        branch,
        commits
    };
}

export async function getCommits(repo: Repository, branch: string, start: "refs/*" | Oid, num = 1000) {
    const revwalk = initRevwalk(repo, start);

    const history: HistoryCommit[] = [];
    for (const commit of await revwalk.commitWalk(num)) {
        history.push(compileHistoryCommit(commit));
    }

    return {
        cursor: history[history.length - 1].sha,
        commits: history,
        branch
    };
}

export async function pull(repo: Repository, branch: string | null, signature: Signature) {
    let ref;
    if (branch) {
        try {
            ref = await repo.getReference(branch);
        } catch (err) {
            if (err instanceof Error) {
                // invalid ref
                dialog.showErrorBox("Pull failed", `Invalid reference '${branch}'\n${err.message}`);
            }
            return false;
        }
    } else {
        ref = await repo.head();
    }

    const currentBranch = await repo.head();

    let upstream: Reference;
    let status: { ahead: number, behind: number };
    try {
        upstream = await Branch.upstream(ref);

        status = await Graph.aheadBehind(repo, upstream.target(), ref.target()) as unknown as { ahead: number, behind: number };
    }
    catch (err) {
        // Missing remote/upstream
        dialog.showErrorBox("Pull failed", "No upstream");
        return false;
    }

    let hardReset = false;
    if (status.behind) {
        if (currentBranch.name() !== ref.name()) {
            dialog.showErrorBox("Pull", `The remote branch '${upstream.name()}' is behind the local branch '${ref.name()}'. Might need a hard reset, checkout '${ref.name()}' before continuing.`);
            return false;
        }
        const result = await dialog.showMessageBox({
            title: "Hard reset?",
            message: `The remote branch '${upstream.name()}' is behind the local branch '${ref.name()}'. Do a hard reset to remote branch?`,
            type: "question",
            buttons: ["Cancel", "No", "Hard reset"],
            cancelId: 0,
        });
        if (result.response === 0) {
            return false;
        }
        if (result.response === 2) {
            hardReset = true;
        }
    }

    let result;
    try {
        if (hardReset) {
            const originHead = await repo.getBranchCommit(upstream);
    
            // Returns 0 on success
            result = !await Reset.reset(repo, originHead, Reset.TYPE.HARD, {});
            index = await repo.refreshIndex();
        } else {
            result = await repo.rebaseBranches(ref.name(), upstream.name(), upstream.name(), signature, (..._args: unknown[]) => {
                // console.log("beforeNextFn:", args);
            });
        }
    } catch (err) {
        if (err instanceof Error) {
            return err;
        }
    }

    if (result) {
        if (currentBranch.name() !== ref.name()) {
            await repo.checkoutBranch(currentBranch);
        }
    }
    return !!result;
}

async function pushHead(context: Context) {
    const head = await context.repo.head();
    let upstream;
    try {
        upstream = await Branch.upstream(head);
    }
    catch (err) {
        if (err instanceof Error) {
            dialog.showErrorBox("Missing upstream", err.message);
        }
        return false;
    }

    const remote = await context.repo.getRemote(remoteName(upstream.name()));

    return pushBranch(context, remote, head);
}

export async function push(context: Context, data: IpcActionParams[IpcAction.PUSH]) {
    sendEvent(context.win, "push-status", {
        done: false
    });

    let result = false;

    const auth = getAuth();
    if (!auth) {
        return Error("No git credentials");
    }
    if (!data) {
        result = await pushHead(context);
    } else {
        const localRef = await context.repo.getReference(data.localBranch);
        const remote = await context.repo.getRemote(data.remote);

        if (localRef.isBranch()) {
            result = await pushBranch(context, remote, localRef, data.force);
        } else if (localRef.isTag()) {
            result = await pushTag(remote, localRef, auth, undefined, context);
        }
    }

    sendEvent(context.win, "push-status", {
        done: true
    });

    return result;
}

async function pushBranch(context: Context, remote: Remote, localRef: Reference, force = false) {
    let remoteRefName: string;
    let status: { ahead: number, behind: number };
    try {
        // throws if no upstream
        const upstream = await Branch.upstream(localRef);
        remoteRefName = normalizeRemoteNameWithoutRemote(upstream.name());

        status = await Graph.aheadBehind(context.repo, localRef.target(), upstream.target()) as unknown as { ahead: number, behind: number };
    } catch (err) {
        if (err instanceof Error) {
            dialog.showErrorBox("Push failed", `Invalid upstream: ${err.message}`);
        }
        return false;
    }

    if (status.behind) {
        const result = await dialog.showMessageBox({
            title: "Force push?",
            message: `'${localRef.name()}' is behind the remote '${localRef.name()}'. Force push?`,
            type: "question",
            buttons: ["Cancel", "No", "Force push"],
            cancelId: 0,
        });
        if (result.response === 0) {
            return false;
        }
        if (result.response === 2) {
            force = true;
        }
    }

    return doPush(remote, localRef.name(), `heads/${remoteRefName}`, force, context);
}

async function pushTag(remote: Remote, localRef: Reference, auth: AuthConfig, remove = false, context?: Context) {
    // We can pass an empty localref to delete a remote ref
    return doPush(remote, remove ? "" : localRef.name(), `tags/${normalizeTagName(localRef.name())}`, undefined, context);
}

async function doPush(remote: Remote, localName: string, remoteName: string, forcePush = false, context?: Context) {
    // something with pathspec, https://github.com/nodegit/nodegit/issues/1270#issuecomment-293742772
    const force = forcePush ? "+" : "";
    try {
        // will return 0 on success
        const pushResult = await remote.push(
            [`${force}${localName}:refs/${remoteName}`],
            {
                callbacks: {
                    credentials: credentialsCallback,

                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    pushTransferProgress: (transferedObjects: number, totalObjects: number, bytes: number) => {
                        context && sendEvent(context.win, "push-status", {
                            totalObjects,
                            transferedObjects,
                            bytes
                        });
                    },
                }
            }
        );
        return !pushResult;
    } catch (err) {
        // invalid authentication?
        if (err instanceof Error) {
            // FIXME: return error message instead of displaying error dialog here
            dialog.showErrorBox("Push failed", err.message);
        }
    }
    return false;
}

export async function setUpstream(repo: Repository, local: string, remoteRefName: string | null) {
    const reference = await repo.getReference(local);
    if (remoteRefName) {
        try {
            await repo.getReference(remoteRefName);
        } catch (err) {
            await Reference.create(repo, `refs/remotes/${remoteRefName}`, (await reference.peel(Object.TYPE.COMMIT)).id() as unknown as Oid, 0, "");
        }
    }
    const result = await Branch.setUpstream(reference, remoteRefName);

    return result;
}

export async function deleteRemoteRef(repo: Repository, refName: string) {
    const ref = await repo.getReference(refName);

    if (ref.isRemote()) {
        refName = ref.name();
        const end = refName.indexOf("/", 14);
        const remoteName = refName.substring(13, end);
        const remote = await repo.getRemote(remoteName);

        const branchName = refName.substring(end + 1);

        try {
            await remote.push([`:refs/heads/${branchName}`], {
                callbacks: {
                    credentials: credentialsCallback
                }
            });
            ref.delete();
        } catch (err) {
            if (err instanceof Error) {
                dialog.showErrorBox("No remote ref found", err.message);
            }
            return false;
        }
    }
    return true;
}

// tagName must contain full path for tag (eg. refs/tags/[tag])
export async function deleteRemoteTag(remote: Remote, tagName: string) {
    try {
        await remote.push([`:${tagName}`], {
            callbacks: {
                credentials: credentialsCallback
            }
        });
    } catch (err) {
        // tag not on remote..
    }

    return true;
}

export async function getHEAD(repo: Repository): AsyncIpcActionReturnOrError<IpcAction.LOAD_HEAD> {
    if (repo.isEmpty()) {
        return null;
    }
    const head = await repo.head();
    const headCommit = await repo.getHeadCommit();

    let headUpstream: string | undefined;
    try {
        const upstream = await Branch.upstream(head);
        headUpstream = upstream.name();
    } catch (_) {
        // no upstream for "head"
    }
    return {
        name: head.name(),
        headSHA: headCommit.id().tostrS(),
        commit: getCommitObj(headCommit),
        normalizedName: head.name(),
        type: RefType.LOCAL,
        remote: headUpstream
    }
}

export async function getUpstreamRefs(repo: Repository): AsyncIpcActionReturnOrError<IpcAction.LOAD_UPSTREAMS> {
    const refs = await repo.getReferences();

    const upstreams: IpcActionReturn[IpcAction.LOAD_UPSTREAMS] = [];

    for (const ref of refs) {
        if (ref.isBranch()) {
            const headCommit = await ref.peel(Object.TYPE.COMMIT);
            try {
                const upstream = await Branch.upstream(ref);
                const upstreamHead = await upstream.peel(Object.TYPE.COMMIT);

                const upstreamObj: IpcActionReturn[IpcAction.LOAD_UPSTREAMS][0] = {
                    status: await Graph.aheadBehind(repo, headCommit.id(), upstreamHead.id()) as unknown as { ahead: number, behind: number },
                    remote: upstream.name(),
                    name: ref.name(),
                };

                upstreams.push(upstreamObj);
            } catch (_) {
                // missing upstream
            }
        }
    }

    return upstreams;
}

export async function showStash(repo: Repository, index: number) {
    const stash = repoStash.at(index);

    if (!stash) {
        return Error("Invalid stash");
    }

    const stashCommit = await Commit.lookup(repo, stash.oid);
    const stashDiff = await stashCommit.getDiff();

    // TODO: Which diff to show?
    const diff = stashDiff[0];

    const patches = await diff.patches();

    const patchesObj = patches.map(async patch => {
        const patchObj = handlePatch(patch);
        patchObj.hunks = await loadHunks(repo, patch);
        return patchObj;
    });

    return Promise.all(patchesObj);
}

export async function getStash(repo: Repository) {
    const stash: StashObj[] = [];
    await Stash.foreach(repo, (index: number, msg: string, oid: Oid) => {
        stash.push({
            index,
            msg,
            oid: oid.tostrS(),
        });
    });
    repoStash = stash;
    return stash;
}

// {local: Branch[], remote: Branch[], tags: Branch[]}
export async function getBranches(repo: Repository): AsyncIpcActionReturnOrError<IpcAction.LOAD_BRANCHES> {
    const local: BranchObj[] = [];
    const remote: BranchObj[] = [];
    const tags: BranchObj[] = [];

    const refs = await repo.getReferences();
    // FIXME: Why do we get 2 references for "refs/remotes/origin/master"
    await Promise.all(
        refs.map(async (ref) => {
            const refObj: BranchObj = {
                name: ref.name(),
                headSHA: ref.target().tostrS(),
                normalizedName: "",
                type: RefType.LOCAL,
            };

            if (ref.isBranch()) {
                refObj.normalizedName = normalizeLocalName(refObj.name);
                local.push(refObj);
            } else if (ref.isRemote()) {
                refObj.normalizedName = normalizeRemoteName(refObj.name);
                refObj.type = RefType.REMOTE;
                remote.push(refObj);
            } else if (ref.isTag()) {
                // We need to handle Tag in a special way. Start with `ref.targetPeel` 
                // (which is way faster) but it seems to fail for "soft" tags?
                // Then fallback to `ref.peel` if `ref.targetPeel` returns null
                let oid = ref.targetPeel();
                if (!oid) {
                    const headCommit = await ref.peel(Object.TYPE.COMMIT);
                    oid = headCommit.id();
                }
                refObj.headSHA = oid.tostrS();

                refObj.normalizedName = normalizeTagName(refObj.name);
                refObj.type = RefType.TAG;
                tags.push(refObj);
            }
        })
    );

    return {
        local,
        remote,
        tags,
    };
}

export async function remotes(repo: Repository): AsyncIpcActionReturnOrError<IpcAction.REMOTES> {
    const remotes = await repo.getRemotes();
    return remotes.map(remote => ({
        name: remote.name(),
        pullFrom: remote.url(),
        pushTo: remote.pushurl(),
    }))
}

export async function findFile(repo: Repository, file: string): AsyncIpcActionReturnOrError<IpcAction.FIND_FILE> {
    await index.read(0);

    const set = new Set<string>();

    let count = 0;

    for (const entry of index.entries()) {
        if (entry.path.toLocaleLowerCase().includes(file.toLocaleLowerCase())) {
            if (!set.has(entry.path)) {
                set.add(entry.path);
                count++;
            }
            if (count >= 99) {
                break;
            }
        }
    }

    return Array.from(set.values())
}

function onSignature(key: string) {
    return async (data: string) => {
        return {
            code: NodeGitError.CODE.OK,
            field: "gpgsig",
            signedData: await gpgSign(key, data),
        };
    }
}
async function amend(parent: Commit, committer: Signature, message: string, gpgKey?: string) {
    const oid = await index.writeTree();
    const author = parent.author();
    if (gpgKey && currentProfile().gpg) {
        await parent.amendWithSignature("HEAD", author, committer, "utf8", message, oid, onSignature(gpgKey));
    } else {
        await parent.amend("HEAD", author, committer, "utf8", message, oid);
    }
}

export async function commit(repo: Repository, params: IpcActionParams[IpcAction.COMMIT]) {
    const profile = currentProfile();
    const committer = signatureFromProfile(profile);
    if (!committer.email()) {
        return Error("No git credentials provided");
    }

    const emptyRepo = repo.isEmpty();
    if (emptyRepo && params.amend) {
        return new Error("Cannot amend in an empty repository");
    }

    const parent = await repo.getHeadCommit();

    try {
        const message = params.message.body ? `${params.message.summary}\n\n${params.message.body}` : params.message.summary;
        const gpgKey = profile.gpg?.commit ? profile.gpg.key : undefined;

        if (params.amend) {
            await amend(parent, committer, message, gpgKey);
        } else {
            const oid = await index.writeTree();
            const parents = emptyRepo ? null : [parent];
            if (gpgKey && currentProfile().gpg) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore, `parents` can be null for the "ROOT" commit (empty repository) https://libgit2.org/libgit2/#HEAD/group/commit/git_commit_create
                await repo.createCommitWithSignature("HEAD", committer, committer, message, oid, parents, onSignature(gpgKey));
            } else {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                await repo.createCommit("HEAD", committer, committer, message, oid, parents);
            }
        }
    } catch (err) {
        return err as Error;
    }

    return loadCommit(repo, null);
}

export async function createTag(repo: Repository, data: IpcActionParams[IpcAction.CREATE_TAG], tagger: Signature, gpgKey?: string) {
    try {
        let id = data.from;

        if (!data.fromCommit) {
            const ref = await repo.getReference(data.from);
            const refAt = await repo.getReferenceCommit(ref);

            id = refAt.id().tostrS();
        }

        if (gpgKey && currentProfile().gpg) {
            await Tag.createWithSignature(repo, data.name, id, tagger, data.annotation || "", 0, onSignature(gpgKey));
        } else if (data.annotation) {
            await repo.createTag(id, data.name, data.annotation);
        } else {
            await repo.createLightweightTag(id, data.name);
        }
    } catch (err) {
        if (err instanceof Error) {
            dialog.showErrorBox("Failed to create tag", err.toString());
        }
    }

    return true;
}

async function getUnstagedPatches(repo: Repository, flags: Diff.OPTION) {
    const unstagedDiff = await Diff.indexToWorkdir(repo, index, {
        flags: Diff.OPTION.INCLUDE_UNTRACKED | Diff.OPTION.SHOW_UNTRACKED_CONTENT | Diff.OPTION.RECURSE_UNTRACKED_DIRS | flags
    });
    const diffOpts: DiffFindOptions = {
        flags: Diff.FIND.RENAMES | Diff.FIND.FOR_UNTRACKED,
    };
    await unstagedDiff.findSimilar(diffOpts);
    return unstagedDiff.patches();
}

async function getStagedDiff(repo: Repository, flags: Diff.OPTION) {
    if (repo.isEmpty()) {
        return Diff.treeToIndex(repo, undefined, index, { flags });
    }

    const head = await repo.getHeadCommit();
    return Diff.treeToIndex(repo, await head.getTree(), index, { flags });
}

async function getStagedPatches(repo: Repository, flags: Diff.OPTION) {
    const stagedDiff = await getStagedDiff(repo, flags);
    const diffOpts: DiffFindOptions = {
        flags: Diff.FIND.RENAMES,
    };
    await stagedDiff.findSimilar(diffOpts);
    return stagedDiff.patches();
}

export async function refreshWorkDir(repo: Repository, options: IpcActionParams[IpcAction.REFRESH_WORKDIR]): AsyncIpcActionReturnOrError<IpcAction.REFRESH_WORKDIR> {
    await index.read(0);

    const flags = options?.flags || 0;

    // TODO: This is slow. Find a better way to determine when to query unstaged changed
    workDirIndexCache.unstagedPatches = await getUnstagedPatches(repo, flags);
    workDirIndexCache.stagedPatches = await getStagedPatches(repo, flags);

    return {
        unstaged: workDirIndexCache.unstagedPatches.length,
        staged: workDirIndexCache.stagedPatches.length,
        status: repoStatus(repo),
    };
}

async function stageSingleFile(repo: Repository, filePath: string) {
    let result;

    try {
        // if fs.access throws the file does not exist on the filesystem
        // and needs to be removed from the index
        await fs.access(join(repo.workdir(), filePath));
        result = await index.addByPath(filePath);
    } catch (err) {
        result = await index.removeByPath(filePath);
    }

    return result;
}
export async function stageFile(repo: Repository, filePath: string): AsyncIpcActionReturnOrError<IpcAction.STAGE_FILE> {
    await index.read(0);

    const result = await stageSingleFile(repo, filePath);

    if (!result) {
        await index.write();
    }

    return true;
}
async function unstageSingleFile(repo: Repository, head: Commit, filePath: string) {
    return Reset.default(repo, head, filePath);
}
export async function unstageFile(repo: Repository, filePath: string): AsyncIpcActionReturnOrError<IpcAction.UNSTAGE_FILE> {
    const head = await repo.getHeadCommit();
    await unstageSingleFile(repo, head, filePath);
    
    await index.read(0);

    return true;
}
// Returns the number of staged files
export async function stageAllFiles(repo: Repository) {
    const statusList = await repo.getStatusExt({
        show: Status.SHOW.WORKDIR_ONLY,
        flags: Status.OPT.INCLUDE_UNTRACKED | Status.OPT.RECURSE_UNTRACKED_DIRS,
    });
    await index.read(0);
    for (const statusItem of statusList) {
        await stageSingleFile(repo, statusItem.path());
    }
    await index.write();
    return statusList.length;
}
// Returns the number of unstaged files
export async function unstageAllFiles(repo: Repository) {
    const statusList = await repo.getStatusExt({
        show: Status.SHOW.INDEX_ONLY,
        flags: Status.OPT.INCLUDE_UNTRACKED | Status.OPT.RECURSE_UNTRACKED_DIRS,
    });
    const head = await repo.getHeadCommit();
    for (const statusItem of statusList) {
        await unstageSingleFile(repo, head, statusItem.path());
    }
    await index.read(0);
    return statusList.length;
}

async function discardSingleFile(repo: Repository, filePath: string) {
    if (!index.getByPath(filePath)) {
        // file not found in index (untracked), delete
        try {
            await fs.unlink(join(repo.workdir(), filePath));
        } catch (err) {
            if (err instanceof Error) {
                return err;
            }
        }
        return true;
    }
    
    try {
        const head = await repo.getHeadCommit();
        const tree = await head.getTree();
        await Checkout.tree(repo, tree, { checkoutStrategy: Checkout.STRATEGY.FORCE, paths: [filePath] });
    } catch (err) {
        console.error(err)
    }

    return true;
}
export async function discardChanges(repo: Repository, filePath: string) {
    if (!index.getByPath(filePath)) {
        // file not found in index (untracked), delete?
        const result = await dialog.showMessageBox({
            message: `Delete untracked file ${filePath}?`,
            type: "question",
            buttons: ["Cancel", "Delete"],
            cancelId: 0,
        });
        if (result.response === 0) {
            return false;
        }
    }

    return discardSingleFile(repo, filePath);
}
export async function discardAllChanges(repo: Repository) {
    const statusList = await repo.getStatusExt({
        show: Status.SHOW.WORKDIR_ONLY,
        flags: Status.OPT.INCLUDE_UNTRACKED | Status.OPT.RECURSE_UNTRACKED_DIRS,
    });
    for (const statusItem of statusList) {
        await discardSingleFile(repo, statusItem.path());
    }
    return statusList.length;
}

export async function loadChanges(): AsyncIpcActionReturnOrError<IpcAction.GET_CHANGES> {
    workDirIndexPathMap.staged.clear();
    workDirIndexPathMap.unstaged.clear();

    const staged = workDirIndexCache.stagedPatches.map(convPatch => {
        const patch = handlePatch(convPatch);
        workDirIndexPathMap.staged.set(patch.actualFile.path, convPatch);
        return patch;
    });
    const unstaged = workDirIndexCache.unstagedPatches.map(convPatch => {
        const patch = handlePatch(convPatch);
        workDirIndexPathMap.unstaged.set(patch.actualFile.path, convPatch);
        return patch;
    });
    return {
        staged,
        unstaged,
    };
}
export async function getWorkdirHunks(repo: Repository, path: string, type: "staged" | "unstaged"): Promise<false | HunkObj[]> {
    const patch = workDirIndexPathMap[type].get(path);
    return patch ? loadHunks(repo, patch, path) : false;
}

function handleLine(line: DiffLine): LineObj {
    const oldLineno = line.oldLineno();
    const newLineno = line.newLineno();
    let type: LineObj["type"] = "";
    if (oldLineno === -1) {
        type = "+";
    } else if (newLineno === -1) {
        type = "-"
    }
    return {
        type,
        offset: line.contentOffset(),
        length: line.contentLen(),
        oldLineno,
        newLineno,
        content: line.rawContent().trimEnd()
    };
}
async function handleHunk(hunk: ConvenientHunk): Promise<HunkObj> {
    const lines = await hunk.lines();

    return {
        header: hunk.header().trim(),
        lines: lines.map(handleLine),
        // old: hunk.oldStart(),
        // new: hunk.newStart()
    };
}
export async function getHunks(repo: Repository, sha: string, path: string): Promise<false | HunkObj[]> {
    const patch = commitObjectCache.get(sha)?.patches.get(path);
    return patch ? loadHunks(repo, patch, path) : false;
}
export async function hunksFromCompare(repo: Repository, path: string): Promise<false | HunkObj[]> {
    const patch = compareObjCache.patches.get(path);
    return patch ? loadHunks(repo, patch, path) : false;
}
async function loadHunks(repo: Repository, patch: ConvenientPatch, path?: string) {
    if (patch.isConflicted() && path) {
        return loadConflictedPatch(repo, path);
    }

    const hunks = await patch.hunks();
    return Promise.all(hunks.map(handleHunk));
}

async function commitDiffParent(commit: Commit, diffOptions?: DiffOptions) {
    const tree = await commit.getTree();

    // TODO: which parent to chose?
    const parents = await commit.getParents(1);
    if (parents.length) {
        const parent = parents[0];
        const parentTree = await parent.getTree();

        return await tree.diffWithOptions(parentTree, diffOptions) as Diff;
    }

    return await tree.diffWithOptions(null, diffOptions) as Diff;
}

export async function diffFileAtCommit(repo: Repository, file: string, sha: string) {
    const historyEntry = fileHistoryCache.get(sha);
    if (!historyEntry) {
        return Error("Revison not found");
    }
    // FIXME: Cannot use this until Revwalk.fileHistoryWalk() sets repo on returned Commit items.
    // const commit = historyEntry.commit;
    const commit = await Commit.lookup(repo, sha);

    const pathspec = [file];

    // Find renames
    if (historyEntry.oldName && historyEntry.oldName !== file) {
        pathspec.push(historyEntry.oldName);
    } else if (historyEntry.newName && historyEntry.newName !== file) {
        pathspec.push(historyEntry.newName);
    }

    const diff = await commitDiffParent(commit, {
        pathspec,
        flags: Diff.OPTION.IGNORE_WHITESPACE,
    });
    await diff.findSimilar({
        flags: Diff.FIND.RENAMES
    });

    const convPatches = await diff.patches();
    if (!convPatches.length) {
        return Error("empty patch");
    }
    const patch = convPatches[0];

    const hunks = (await patch.hunks()).map(async hunk => (
        {
            header: hunk.header().trim(),
            lines: (await hunk.lines()).map(handleLine),
        }
    ));

    const patchObj = handlePatch(patch);
    patchObj.hunks = await Promise.all(hunks);

    return patchObj;
}

async function loadConflictedPatch(repo: Repository, path: string): Promise<HunkObj[]> {
    const conflictEntry = await index.conflictGet(path || "") as unknown as {ancestor_out: IndexEntry, our_out: IndexEntry | null, their_out: IndexEntry | null};

    if (!conflictEntry.their_out) {
        return [{
            header: "Their file deleted!, ('our' is refering to the branch we are rebasing onto. 'their' is the branch we are rebasing from)",
            lines: [],
        }];
    }

    if (!conflictEntry.our_out) {
        return [{
            header: "Our file deleted!, ('our' is refering to the branch we are rebasing onto. 'their' is the branch we are rebasing from)",
            lines: [],
        }];
    }

    const hunks: HunkObj[] = [];

    if ((await fs.stat(join(repo.workdir(), path))).size < 1 * 1024 * 1024) {
        const fileContent = await fs.readFile(join(repo.workdir(), path));
        const lineFeedCodepoint = "\n".codePointAt(0);

        let conflictCursor = 0;

        while (conflictCursor !== -1) {
            const start = fileContent.indexOf("\n<<<<<<<", conflictCursor);
            if (start < 0) {
                break;
            }
            const end = fileContent.indexOf("\n>>>>>>>", start);
            conflictCursor = end;
    
            const content = fileContent.subarray(start, end + 9).toString();
            const startLine = fileContent.subarray(0, start).filter(chr => chr === lineFeedCodepoint).length + 1;
    
            const lines = content.toString().split("\n").map((line, index): LineObj => ({
                content: line,
                type: "",
                newLineno: index + startLine,
                oldLineno: index + startLine,
            }));

            hunks.push({
                header: "",
                lines,
            });
        }
    }

    return hunks.length ? hunks : [{
        header: "",
        lines: [
            {
                type: "",
                newLineno: 1,
                oldLineno: 1,
                content: ""
            }
        ]
    }];
}

export async function resolveConflict(repo: Repository, path: string): Promise<boolean> {
    const conflictEntry = await index.conflictGet(path) as unknown as {ancestor_out: IndexEntry, our_out: IndexEntry | null, their_out: IndexEntry | null};

    if (!conflictEntry.our_out) {
        const res = await dialog.showMessageBox({
            title: "\"Our\" file deleted",
            message: "The file was deleted from the source branch.",
            type: "question",
            buttons: ["Cancel", "Delete file", "Stage existing file"],
            cancelId: 0,
        });
        if (res.response === 0) {
            return false;
        }
        if (res.response === 2) {
            await index.addByPath(path);
            await index.conflictRemove(path);
        } else {
            try {
                await fs.unlink(join(repo.workdir(), path));
            } catch (err) {
                console.error(err);
            }
            await index.removeByPath(path);
        }
    } else if (!conflictEntry.their_out) {
        const res = await dialog.showMessageBox({
            title: "\"Their\" file deleted",
            message: "The file was deleted from the target branch.",
            type: "question",
            buttons: ["Cancel", "Stage existing file", "Delete file"],
            cancelId: 0,
        });
        if (res.response === 0) {
            return false;
        }
        if (res.response === 2) {
            try {
                await index.removeByPath(path);
            } catch (err) {
                console.error(err);
            }
        } else {
            await index.addByPath(path);
            await index.conflictRemove(path);
        }
    } else {
        if ((await fs.stat(join(repo.workdir(), path))).size < 1 * 1024 * 1024) {
            const content = await fs.readFile(join(repo.workdir(), path));
            if (content.includes("\n<<<<<<<") || content.includes("\n>>>>>>>")) {
                const res = await dialog.showMessageBox({
                    message: "The file seems to still contain conflict markers. Stage anyway?",
                    type: "question",
                    buttons: ["No", "Stage file"],
                    cancelId: 0,
                });
                if (res.response !== 1) {
                    return false;
                }
            }
        }

        await index.addByPath(path);
        await index.conflictRemove(path);
    }

    await index.write();
    return true;
}

function handlePatch(patch: ConvenientPatch): PatchObj {
    const patchNewFile = patch.newFile();
    const patchOldFile = patch.oldFile();

    const newFile = {
        path: patchNewFile.path(),
        size: patchNewFile.size(),
        mode: patchNewFile.mode(),
        flags: patchNewFile.flags(),
    };
    const oldFile = {
        path: patchOldFile.path(),
        size: patchOldFile.size(),
        mode: patchOldFile.mode(),
        flags: patchOldFile.flags(),
    };

    return {
        status: patch.status(),
        lineStats: patch.lineStats(),
        newFile,
        oldFile,
        actualFile: newFile.path ? newFile : oldFile,
    } as PatchObj;
}

async function handleDiff(diff: Diff, convPatches: Map<string, ConvenientPatch>) {
    const patches = await diff.patches();
    return patches.map(convPatch => {
        const patch = handlePatch(convPatch);
        convPatches.set(patch.actualFile.path, convPatch);
        return patch;
    });
}

export async function getCommitPatches(sha: string, options?: DiffOptions): AsyncIpcActionReturnOrError<IpcAction.LOAD_PATCHES_WITHOUT_HUNKS> {
    const commit = commitObjectCache.get(sha);
    if (!commit) {
        return Error("Revison not found");
    }

    const diff = await commitDiffParent(commit.commit, options);
    await diff.findSimilar({
        flags: Diff.FIND.RENAMES,
    });

    return handleDiff(diff, commit.patches);
}

export async function compareRevisions(repo: Repository, revisions: { from: string, to: string }) {
    const fromCommit = repo.getReference(revisions.from)
        .then(ref => ref.peel(Object.TYPE.COMMIT) as unknown as Commit)
        .then(commit => commit.id().tostrS())
        .catch(() => revisions.from)
        .then(sha => repo.getCommit(sha));

    const toCommit = repo.getReference(revisions.to)
        .then(ref => ref.peel(Object.TYPE.COMMIT) as unknown as Commit)
        .then(commit => commit.id().tostrS())
        .catch(() => revisions.to)
        .then(sha => repo.getCommit(sha));

    return Promise.all([fromCommit, toCommit]).then(async commits => {
        // TODO: show commits if `descandant === true`
        compareObjCache = {
            descendant: await Graph.descendantOf(repo, commits[0].id(), commits[1].id()) === 1,
            from: commits[0],
            to: commits[1],
            patches: new Map(),
        };
        return true;
    }).catch(_ => {
        return false;
    });
}

export async function compareRevisionsPatches() {
    const from = compareObjCache.from;
    const to = compareObjCache.to;

    // TODO: fix this. Merge commits are a bit messy without this.
    const tree = await to.getTree();
    const diffOpts: DiffFindOptions = {
        flags: Diff.FIND.RENAMES | Diff.FIND.IGNORE_WHITESPACE,
    };

    const diff = await from.getTree().then(async fromTree => await tree.diffWithOptions(fromTree));
    await diff.findSimilar(diffOpts);

    const patches = await handleDiff(diff, compareObjCache.patches);

    return patches.flat();
}

function getCommitObj(commit: Commit): CommitObj {
    const author = commit.author();
    const committer = commit.committer();

    const msg = commit.message();
    const msgSummary = msg.substring(0, msg.indexOf("\n") >>> 0);
    const msgBody = msg.substring(msgSummary.length).trim();

    return {
        parents: commit.parents().map(parent => ({ sha: parent.tostrS() })),
        sha: commit.sha(),
        authorDate: author.when().time(),
        date: committer.when().time(),
        message: {
            summary: msgSummary,
            body: msgBody
        },
        author: {
            name: author.name(),
            email: author.email()
        },
        committer: {
            name: committer.name(),
            email: committer.email()
        },
    };
}

export async function loadCommit(repo: Repository, sha: string | null) {
    const commit = sha ? await commitWithDiff(repo, sha) : await repo.getHeadCommit();
    if (commit instanceof Error) {
        // Probably an invalid revspec path
        return commit;
    }

    const commitObj = getCommitObj(commit);

    if (currentProfile().gpg) {
        try {
            const commitSignature = await commit.getSignature("gpgsig");
            commitObj.signature = await gpgVerify(commitSignature.signature, commitSignature.signedData)
        } catch (err) {
            // Commit is probably not signed.
        }
    }

    return commitObj;
}

export async function parseRevspec(repo: Repository, sha: string) {
    try {
        const revspec = await Revparse.single(repo, sha);
        return revspec.id();
    } catch (e) {
        return e as Error;
    }
}

export async function commitWithDiff(repo: Repository, sha: string) {
    const oid = await parseRevspec(repo, sha);
    if (oid instanceof Error) {
        return oid;
    }

    const commit = await repo.getCommit(oid);
    commitObjectCache.clear();
    commitObjectCache.set(oid.tostrS(), {
        commit,
        patches: new Map(),
    });

    return commit;
}

export async function checkoutBranch(repo: Repository, branch: string): AsyncIpcActionReturnOrError<IpcAction.CHECKOUT_BRANCH> {
    try {
        await repo.checkoutBranch(branch);
        const head = await repo.head();
        const headCommit = await repo.getHeadCommit()
        return {
            name: head.name(),
            headSHA: headCommit.id().tostrS(),
            commit: getCommitObj(headCommit),
            normalizedName: head.name(),
            type: RefType.LOCAL
        };
    } catch (err) {
        return err as Error;
    }
}

export async function openFileAtCommit(repo: Repository, data: IpcActionParams[IpcAction.OPEN_FILE_AT_COMMIT]): AsyncIpcActionReturnOrError<IpcAction.OPEN_FILE_AT_COMMIT> {
    try {
        const commit = await repo.getCommit(data.sha);

        const tree = await commit.getTree();

        const entry = await tree.getEntry(data.file);

        const fileBlob = await entry.getBlob();

        const tempDir = await fs.mkdtemp(join(tmpdir(), "git-good-"));

        const tempFileName = data.file.replaceAll("/", "_");
        await fs.writeFile(`${tempDir}/${tempFileName}`, fileBlob.content());
        shell.openPath(`${tempDir}/${tempFileName}`);

        return true;
    } catch (err) {
        console.error(err);
        return false
    }
}

let repoStash: StashObj[] = [];
const commitObjectCache: Map<string, {
    commit: Commit
    patches: Map<string, ConvenientPatch>
}> = new Map();
let compareObjCache: {
    descendant: boolean
    from: Commit
    to: Commit
    patches: Map<string, ConvenientPatch>
};
const fileHistoryCache: Map<string, Revwalk.HistoryEntry> = new Map();
const workDirIndexCache: {
    unstagedPatches: ConvenientPatch[]
    stagedPatches: ConvenientPatch[]
} = {
    unstagedPatches: [],
    stagedPatches: []
};
const workDirIndexPathMap: {
    staged: Map<string, ConvenientPatch>
    unstaged: Map<string, ConvenientPatch>
} = {
    staged: new Map(),
    unstaged: new Map(),
};
let index: Index;
