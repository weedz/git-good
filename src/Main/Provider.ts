import { dialog, shell } from "electron";
import * as fs from "fs/promises";
import type { DiffFindOptions, DiffOptions } from "nodegit";
import nodegit from "nodegit";
import { tmpdir } from "os";
import { join } from "path";

import type { TransferProgress } from "../../types/nodegit/index.js";
import type {
  AsyncIpcActionReturnOrError,
  BranchObj,
  CommitObj,
  HunkObj,
  IpcActionParams,
  IpcActionReturn,
  IpcActionReturnOrError,
  LineObj,
  LoadFileCommitsReturn,
  PatchObj,
  StashObj,
} from "../Common/Actions.js";
import { IpcAction, RefType } from "../Common/Actions.js";
import {
  getRemoteName,
  HEAD_REF,
  HISTORY_REF,
  normalizeLocalName,
  normalizeRemoteName,
  normalizeRemoteNameWithoutRemote,
  normalizeTagName,
} from "../Common/Branch.js";
import type { AppConfig, AuthConfig } from "../Common/Config.js";
import { DiffDelta } from "../Common/Utils.js";
import { AppEventType } from "../Common/WindowEventTypes.js";
import { currentProfile, getAppConfig, getAuth, signatureFromActiveProfile, signatureFromProfile } from "./Config.js";
import { type Context, setLastKnownHead } from "./Context.js";
import { gpgSign, gpgVerify } from "./GPG.js";
import { sendAction } from "./IPC.js";
import { CheckoutSTRATEGY, DiffFIND, DiffOPTION, NodeGitErrorCODE, ObjectTYPE, ResetTYPE, RevwalkSORT, StatusOPT, StatusSHOW } from "./NodegitEnums.js";
import { sendEvent } from "./WindowEvents.js";

declare module "nodegit" {
  interface Repository {
    rebaseBranches(
      branch: string | nodegit.Reference,
      upstream: string | nodegit.Reference,
      onto: string | nodegit.Reference,
      signature: nodegit.Signature,
      beforeNextFn?: (rebase?: nodegit.Rebase) => Promise<unknown> | unknown,
    ): Promise<nodegit.Oid>;

    continueRebase(signature: nodegit.Signature, beforeNextFn?: (rebase?: nodegit.Rebase) => Promise<unknown> | unknown): Promise<nodegit.Oid>;
  }

  interface Index {
    // Seems like these are actually async
    read(i: number): Promise<number>;
    conflictRemove(path: string): Promise<number>;
  }

  interface Tree {
    // see https://github.com/nodegit/nodegit/pull/1919
    getAllFilepaths(): Promise<string[]>;
  }
}

export function authenticate(username: string, auth: AuthConfig): nodegit.Credential | false {
  if (auth.authType === "ssh") {
    if (auth.sshAgent) {
      return nodegit.Credential.sshKeyFromAgent(username || "git");
    }
    return nodegit.Credential.sshKeyNew(username, auth.sshPublicKey, auth.sshPrivateKey, auth.sshPassphrase || "");
  } else if (auth.authType === "userpass") {
    return nodegit.Credential.userpassPlaintextNew(auth.username, auth.password);
  }

  return false;
}
export function credentialsCallback(_url: string, username: string): nodegit.Credential | false {
  const auth = getAuth();
  if (auth) {
    return authenticate(username, auth);
  }

  return false;
}

export async function openRepo(repoPath: string): Promise<nodegit.Repository | false> {
  try {
    const repo = await nodegit.Repository.open(repoPath);
    index = await repo.refreshIndex();
    return repo;
  } catch (_) {
    return false;
  }
}

export function repoStatus(repo: nodegit.Repository) {
  return {
    // FIXME: Is this correct, can we use `repo.headUnborn()` here?
    empty: repo.isEmpty() || repo.headUnborn(),
    merging: repo.isMerging(),
    rebasing: repo.isRebasing(),
    reverting: repo.isReverting(),
    bisecting: repo.isBisecting(),
    state: repo.state(),
  };
}

type HistoryCommit = {
  parents: string[];
  sha: string;
  message: string;
  date: number;
  author: {
    name: string;
    email: string;
  };
  path?: string;
  status?: number;
};
function compileHistoryCommit(commit: nodegit.Commit): HistoryCommit {
  const author = commit.author();
  return {
    parents: commit.parents().map(oid => oid.tostrS()),
    sha: commit.sha(),
    message: commit.message(),
    date: commit.date().getTime(),
    author: {
      name: author.name(),
      email: author.email(),
    },
  };
}

function initRevwalk(repo: nodegit.Repository, start: "refs/*" | nodegit.Oid): nodegit.Revwalk {
  const revwalk = repo.createRevWalk();
  if (getAppConfig().commitlistSortOrder === "topological") {
    revwalk.sorting(RevwalkSORT.TOPOLOGICAL | RevwalkSORT.TIME);
  }

  if (start === "refs/*") {
    revwalk.pushGlob(start);
  } else {
    revwalk.push(start);
  }
  return revwalk;
}

async function initGetCommits(
  repo: nodegit.Repository,
  params: IpcActionParams[IpcAction.LOAD_COMMITS] | IpcActionParams[IpcAction.LOAD_FILE_COMMITS],
): Promise<
  false | {
    branch: string;
    revwalkStart: nodegit.Oid | "refs/*";
  }
> {
  if (repo.isEmpty() || repo.headUnborn()) {
    return false;
  }

  let branch: string = HEAD_REF;
  let revwalkStart: typeof HISTORY_REF | nodegit.Oid;
  // FIXME: organize this...
  if ("history" in params) {
    branch = HISTORY_REF;
    revwalkStart = HISTORY_REF;
  } else {
    let start: nodegit.Commit | null = null;
    if ("branch" in params) {
      branch = params.branch;
    }
    try {
      if (params.cursor) {
        start = await repo.getCommit(params.cursor);
        if (!start.parentcount()) {
          return false;
        }
        if (!params.startAtCursor) {
          start = await start.parent(0);
        }
      } else if ("branch" in params) {
        if (params.branch.includes("refs/tags")) {
          try {
            start = await repo.getReferenceCommit(params.branch);
          } catch (_) {
            // Soft tag?
            const ref = await repo.getTagByName(params.branch);
            revwalkStart = ref.targetId();
          }
        } else {
          start = await repo.getReferenceCommit(params.branch);
        }
      } else if ("sha" in params) {
        start = await repo.getCommit(params.sha);
      }
    } catch (err) {
      // could not find requested ref
      console.info("initGetCommits(): could not find requested ref, using head", err);
    }
    if (!start) {
      start = await repo.getHeadCommit();
    }
    if (!start) {
      console.warn("Failed to find 'start' commit.");
      return false;
    }
    revwalkStart ??= start.id();
  }

  return {
    branch,
    revwalkStart,
  };
}

export async function getFileCommits(
  repo: nodegit.Repository,
  params: IpcActionParams[IpcAction.LOAD_FILE_COMMITS],
): AsyncIpcActionReturnOrError<IpcAction.LOAD_FILE_COMMITS> {
  const args = await initGetCommits(repo, params);
  if (!args) {
    return null;
  }
  const revwalk = initRevwalk(repo, args.revwalkStart);

  let followRenames = false;

  let currentName = params.file;
  // FIXME: HistoryEntry should set commit.repo.
  const historyEntries = await revwalk.fileHistoryWalk(currentName, params.num || 50000);

  if (historyEntries[0].status === DiffDelta.RENAMED as unknown as nodegit.Diff.DELTA) {
    // We always "follow renames" if the file is renamed in the first commit
    followRenames = true;
  }

  const commits: LoadFileCommitsReturn["commits"] = [];

  fileHistoryCache.clear();

  for (let i = 0, len = historyEntries.length; i < len; ++i) {
    const entry = historyEntries[i];
    const commit = entry.commit;
    const historyCommit = compileHistoryCommit(entry.commit);
    historyCommit.status = entry.status;

    historyCommit.path = currentName;

    if (entry.status === DiffDelta.RENAMED as unknown as nodegit.Diff.DELTA) {
      historyCommit.path = entry.oldName;
    }

    if (entry.status === DiffDelta.RENAMED as unknown as nodegit.Diff.DELTA && followRenames) {
      followRenames = false;

      historyCommit.path = entry.newName;

      currentName = entry.oldName;
    }

    commits.push(historyCommit as HistoryCommit & { path: string; });

    if (!entry.oldName) {
      entry.oldName = currentName;
    }
    fileHistoryCache.set(commit.sha(), entry);
  }

  return {
    filePath: params.file,
    cursor: historyEntries[historyEntries.length - 1]?.commit.sha(),
    branch: args.branch,
    commits,
  };
}

export async function getCommits(
  repo: nodegit.Repository,
  params: IpcActionParams[IpcAction.LOAD_COMMITS],
): AsyncIpcActionReturnOrError<IpcAction.LOAD_COMMITS> {
  const args = await initGetCommits(repo, params);
  if (!args) {
    return null;
  }

  const revwalk = initRevwalk(repo, args.revwalkStart);
  const commits = await revwalk.commitWalk(params.num || 1000);

  const history: HistoryCommit[] = commits.map(compileHistoryCommit);

  return {
    cursor: history[history.length - 1].sha,
    commits: history,
    branch: args.branch,
  };
}

export async function continueRebase(repo: nodegit.Repository): AsyncIpcActionReturnOrError<IpcAction.CONTINUE_REBASE> {
  if (!repo.isRebasing()) {
    return false;
  }

  try {
    const result = await repo.continueRebase(signatureFromActiveProfile());
    console.log("Result:", result);
    return Boolean(result);
  } catch (err) {
    console.log("Error:", err);
    if (err instanceof Error) {
      return err;
    }
  }

  return false;
}

export async function fetchRemote(remotes: nodegit.Remote[]): Promise<boolean> {
  const updatedRemotes: boolean[] = Array(remotes.length);
  const promises: Promise<number>[] = Array(remotes.length);

  for (let i = 0, len = remotes.length; i < len; ++i) {
    const remoteName = remotes[i].name();
    sendEvent(AppEventType.NOTIFY_FETCH_STATUS, {
      init: true,
      remote: remoteName,
    });

    const fetchPromise = remotes[i].fetch([], {
      prune: 1,
      callbacks: {
        credentials: credentialsCallback,
        transferProgress: (stats: TransferProgress) => {
          updatedRemotes[i] = true;
          sendEvent(AppEventType.NOTIFY_FETCH_STATUS, {
            remote: remoteName,
            receivedObjects: stats.receivedObjects(),
            totalObjects: stats.totalObjects(),
            indexedDeltas: stats.indexedDeltas(),
            totalDeltas: stats.totalDeltas(),
            indexedObjects: stats.indexedObjects(),
            receivedBytes: stats.receivedBytes(),
          });
        },
      },
    }, "");

    fetchPromise.catch(err => {
      if (err instanceof Error) {
        dialog.showErrorBox(`Fetch failed for remote '${remoteName}'`, err.message);
      }
    });

    fetchPromise.finally(() => {
      sendEvent(AppEventType.NOTIFY_FETCH_STATUS, {
        remote: remoteName,
        done: true,
        update: !!updatedRemotes[i],
      });
    });

    promises[i] = fetchPromise;
  }

  await Promise.allSettled(promises);

  return true;
}

export async function fetchRemoteFrom(repo: nodegit.Repository, params: IpcActionParams[IpcAction.FETCH]): AsyncIpcActionReturnOrError<IpcAction.FETCH> {
  const remotes = params?.remote ? [await repo.getRemote(params.remote)] : await repo.getRemotes();

  return fetchRemote(remotes);
}

/**
 * @throws {Error}
 */
export async function clone(source: string, targetDir: string): Promise<nodegit.Repository> {
  sendEvent(AppEventType.NOTIFY_CLONE_STATUS, {
    done: false,
  });
  const clonedRepo = await nodegit.Clone(source, targetDir, {
    fetchOpts: {
      callbacks: {
        credentials: credentialsCallback,
        transferProgress: (stats: TransferProgress) => {
          sendEvent(AppEventType.NOTIFY_CLONE_STATUS, {
            receivedObjects: stats.receivedObjects(),
            totalObjects: stats.totalObjects(),
            indexedDeltas: stats.indexedDeltas(),
            totalDeltas: stats.totalDeltas(),
            indexedObjects: stats.indexedObjects(),
            receivedBytes: stats.receivedBytes(),
          });
        },
      },
    },
  });
  sendEvent(AppEventType.NOTIFY_CLONE_STATUS, {
    done: true,
    source,
    target: targetDir,
  });

  return clonedRepo;
}

export function pullHead(repo: nodegit.Repository): AsyncIpcActionReturnOrError<IpcAction.PULL> {
  return pull(repo, null, signatureFromActiveProfile());
}
export async function pull(repo: nodegit.Repository, branch: string | null, signature: nodegit.Signature): Promise<boolean> {
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

  let upstream: nodegit.Reference;
  let status: { ahead: number; behind: number; };
  try {
    upstream = await nodegit.Branch.upstream(ref);

    status = await nodegit.Graph.aheadBehind(repo, upstream.target(), ref.target()) as unknown as { ahead: number; behind: number; };
  } catch (err) {
    // (probably) Missing remote/upstream
    if (err instanceof Error) {
      dialog.showErrorBox("Pull failed", `No upstream.\n${err.message}`);
    } else {
      dialog.showErrorBox("Pull failed", `No upstream.\nUnknown error.`);
    }
    return false;
  }

  let hardReset = false;
  if (status.behind) {
    if (currentBranch.name() !== ref.name()) {
      dialog.showErrorBox(
        "Pull",
        `The remote branch '${upstream.name()}' is behind the local branch '${ref.name()}'. Might need a hard reset, checkout '${ref.name()}' before continuing.`,
      );
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

      await nodegit.Reset.reset(repo, originHead, ResetTYPE.HARD as unknown as nodegit.Reset.TYPE, {});
      index = await repo.refreshIndex();
      result = true;
    } else {
      result = await repo.rebaseBranches(ref, upstream, upstream, signature);
    }
  } catch (err) {
    if (err instanceof Error) {
      dialog.showErrorBox("Failed to pull", err.toString());
      return false;
    }
  }

  if (result) {
    if (currentBranch.name() !== ref.name()) {
      await repo.checkoutRef(currentBranch);
    }
  } else {
    dialog.showErrorBox("Failed to pull", "Possible conflict, check index");
  }

  return !!result;
}

async function pushHead(context: Context): Promise<boolean> {
  const head = await context.repo.head();
  let upstream;
  try {
    upstream = await nodegit.Branch.upstream(head);
  } catch (err) {
    if (err instanceof Error) {
      dialog.showErrorBox("Missing upstream", err.message);
    }
    return false;
  }

  const remote = await context.repo.getRemote(getRemoteName(upstream.name()));

  return pushBranch(context, remote, head);
}

export async function push(context: Context, data: IpcActionParams[IpcAction.PUSH]): AsyncIpcActionReturnOrError<IpcAction.PUSH> {
  sendEvent(AppEventType.NOTIFY_PUSH_STATUS, {
    done: false,
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
      result = await pushTag(remote, localRef, undefined, context);
    }
  }

  sendEvent(AppEventType.NOTIFY_PUSH_STATUS, {
    done: true,
  });

  return result;
}

async function pushBranch(context: Context, remote: nodegit.Remote, localRef: nodegit.Reference, force = false): Promise<boolean> {
  let remoteRefName: string;
  let status: { ahead: number; behind: number; };
  try {
    // throws if no upstream
    const upstream = await nodegit.Branch.upstream(localRef);
    remoteRefName = normalizeRemoteNameWithoutRemote(upstream.name());

    status = await nodegit.Graph.aheadBehind(context.repo, localRef.target(), upstream.target()) as unknown as { ahead: number; behind: number; };
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

  return await doPush(remote, localRef.name(), `heads/${remoteRefName}`, force, context);
}

async function pushTag(remote: nodegit.Remote, localRef: nodegit.Reference, remove = false, context?: Context): Promise<boolean> {
  // We can pass an empty localref to delete a remote ref
  return await doPush(remote, remove ? "" : localRef.name(), `tags/${normalizeTagName(localRef.name())}`, undefined, context);
}

async function doPush(remote: nodegit.Remote, localName: string, remoteName: string, forcePush = false, context?: Context): Promise<boolean> {
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
          // @ts-expect-error We do in fact have a `pushTransferProgress` callback <https://github.com/libgit2/libgit2/blob/17c410059261def387a7ea66da8b9062cb1b4141/include/git2/remote.h#L616>
          pushTransferProgress: (transferedObjects: number, totalObjects: number, bytes: number) => {
            context && sendEvent(AppEventType.NOTIFY_PUSH_STATUS, {
              totalObjects,
              transferedObjects,
              bytes,
            });
          },
        },
      },
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

export async function setUpstream(repo: nodegit.Repository, local: string, remoteRefName: string | null): Promise<boolean> {
  const reference = await repo.getReference(local);
  if (remoteRefName) {
    try {
      await repo.getReference(`refs/remotes/${remoteRefName}`);
    } catch (_) {
      const refCommit = await repo.getReferenceCommit(reference);
      await nodegit.Reference.create(repo, `refs/remotes/${remoteRefName}`, refCommit.id(), 0, "");
    }
  }
  // Returns 0 on success
  return !await nodegit.Branch.setUpstream(reference, remoteRefName);
}

export async function deleteRef(repo: nodegit.Repository, name: string): Promise<boolean> {
  const ref = await repo.getReference(name);
  // Returns 0 on success
  return !nodegit.Branch.delete(ref);
}

export async function deleteRemoteRef(repo: nodegit.Repository, refName: string): Promise<boolean> {
  const ref = await repo.getReference(refName);

  if (ref.isRemote()) {
    refName = ref.name();
    const end = refName.indexOf("/", 14);
    const remoteName = refName.substring(13, end);
    const remote = await repo.getRemote(remoteName).catch(_ => null);

    // It is possible to have a reference in a non-existing remote
    if (remote) {
      const branchName = refName.substring(end + 1);

      try {
        // `:[ref_name]` will delete the remote branch
        await remote.push([`:refs/heads/${branchName}`], {
          callbacks: {
            credentials: credentialsCallback,
          },
        });
      } catch (err) {
        if (err instanceof Error) {
          dialog.showErrorBox("No remote ref found", err.message);
        }
        return false;
      }
    }

    ref.delete();
  }
  return true;
}
export async function deleteTag(repo: nodegit.Repository, data: { name: string; remote: boolean; }): Promise<boolean> {
  if (data.remote) {
    // FIXME: Do we really need to check every remote?
    const remotes = await repo.getRemotes();
    await Promise.all(remotes.map(remote => deleteRemoteTag(remote, data.name)));
  }

  try {
    await repo.deleteTagByName(data.name);
  } catch (err) {
    if (err instanceof Error) {
      dialog.showErrorBox("Could not delete tag", err.toString());
    }
  }

  return true;
}

// tagName must contain full path for tag (eg. refs/tags/[tag])
export async function deleteRemoteTag(remote: nodegit.Remote, tagName: string): Promise<boolean> {
  try {
    await remote.push([`:${tagName}`], {
      callbacks: {
        credentials: credentialsCallback,
      },
    });
  } catch (_) {
    // tag not on remote..
  }

  return true;
}

async function getHeadStruct(repo: nodegit.Repository) {
  const head = await repo.head();
  const headCommit = await repo.getHeadCommit();

  setLastKnownHead(headCommit.id());

  let headUpstream: string | undefined;
  try {
    const upstream = await nodegit.Branch.upstream(head);
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
    remote: headUpstream,
  };
}

export async function getHEAD(repo: nodegit.Repository): AsyncIpcActionReturnOrError<IpcAction.LOAD_HEAD> {
  if (repo.isEmpty() || repo.headUnborn()) {
    return null;
  }

  return await getHeadStruct(repo);
}

export async function getUpstreamRefs(repo: nodegit.Repository): AsyncIpcActionReturnOrError<IpcAction.LOAD_UPSTREAMS> {
  const refs = await repo.getReferences();

  const upstreams = await Promise.all(refs.map(async ref => {
    if (ref.isBranch()) {
      const headCommit = await repo.getReferenceCommit(ref);
      try {
        const upstream = await nodegit.Branch.upstream(ref);
        const upstreamHead = await repo.getReferenceCommit(upstream);

        const upstreamObj: IpcActionReturn[IpcAction.LOAD_UPSTREAMS][0] = {
          status: await nodegit.Graph.aheadBehind(repo, headCommit.id(), upstreamHead.id()) as unknown as { ahead: number; behind: number; },
          remote: upstream.name(),
          name: ref.name(),
        };

        return upstreamObj;
      } catch (_) {
        // missing upstream
      }
    }
    return null;
  }));

  return upstreams.filter(upstream => upstream !== null) as IpcActionReturn[IpcAction.LOAD_UPSTREAMS];
}

export async function showStash(repo: nodegit.Repository, index: number): AsyncIpcActionReturnOrError<IpcAction.SHOW_STASH> {
  const stash = repoStash.at(index);

  if (!stash) {
    return Error("Invalid stash");
  }

  const stashCommit = await nodegit.Commit.lookup(repo, stash.oid);
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

export async function getStash(repo: nodegit.Repository): AsyncIpcActionReturnOrError<IpcAction.LOAD_STASHES> {
  const stash: StashObj[] = [];
  await nodegit.Stash.foreach(repo, (index: number, msg: string, oid: nodegit.Oid) => {
    stash.push({
      index,
      msg,
      oid: oid.tostrS(),
    });
  });
  repoStash = stash;
  return stash;
}

export async function stashPop(repo: nodegit.Repository, index = 0): Promise<boolean> {
  await nodegit.Stash.pop(repo, index);
  await sendRefreshWorkdirEvent(repo);
  sendAction(IpcAction.LOAD_STASHES, await getStash(repo));
  sendEvent(AppEventType.NOTIFY, { title: `Popped stash@{${index}}` });
  return true;
}
export async function stashApply(repo: nodegit.Repository, index = 0): Promise<boolean> {
  await nodegit.Stash.apply(repo, index);
  await sendRefreshWorkdirEvent(repo);
  sendEvent(AppEventType.NOTIFY, { title: `Applied stash@{${index}}` });
  return true;
}
export async function stashDrop(repo: nodegit.Repository, index = 0): Promise<boolean> {
  const result = await dialog.showMessageBox({
    title: "Drop stash",
    message: `Are you sure you want to delete stash@{${index}}`,
    type: "question",
    buttons: ["Cancel", "Delete"],
    cancelId: 0,
  });
  if (result.response === 1) {
    await nodegit.Stash.drop(repo, index);
    sendAction(IpcAction.LOAD_STASHES, await getStash(repo));
    sendEvent(AppEventType.NOTIFY, { title: `Dropped stash@{${index}}` });
    return true;
  }
  return false;
}

// {local: Branch[], remote: Branch[], tags: Branch[]}
export async function getBranches(repo: nodegit.Repository): AsyncIpcActionReturnOrError<IpcAction.LOAD_BRANCHES> {
  const local: BranchObj[] = [];
  const remote: BranchObj[] = [];
  const tags: BranchObj[] = [];

  const currentHead = await repo.getHeadCommit();
  // When in "unborn" state, we have no head (obviously)
  if (currentHead) {
    setLastKnownHead(currentHead.id());
  }

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
          const headCommit = await ref.peel(ObjectTYPE.COMMIT as unknown as nodegit.Object.TYPE);
          oid = headCommit.id();
        }
        refObj.headSHA = oid.tostrS();

        refObj.normalizedName = normalizeTagName(refObj.name);
        refObj.type = RefType.TAG;
        tags.push(refObj);
      }
    }),
  );

  return {
    local,
    remote,
    tags,
  };
}

export async function deleteRemote(repo: nodegit.Repository, remote: string) {
  return await nodegit.Remote.delete(repo, remote);
}

export async function getRemotes(repo: nodegit.Repository): AsyncIpcActionReturnOrError<IpcAction.REMOTES> {
  const remotes = await repo.getRemotes();
  return remotes.map(remote => ({
    name: remote.name(),
    pullFrom: remote.url(),
    pushTo: remote.pushurl(),
  }));
}

export async function findFile(repo: nodegit.Repository, file: string): AsyncIpcActionReturnOrError<IpcAction.FIND_FILE> {
  file = file.toLocaleLowerCase();

  const matches: string[] = [];

  const head = await repo.getHeadCommit();
  const tree = await head.getTree();

  const paths: string[] = await tree.getAllFilepaths();
  for (let i = 0, len = paths.length; i < len; ++i) {
    if (paths[i].toLocaleLowerCase().includes(file)) {
      matches.push(paths[i]);
      if (matches.length >= 99) {
        break;
      }
    }
  }

  return matches;
}

function onSignature(key: string) {
  return async (data: string) => {
    return {
      code: NodeGitErrorCODE.OK as unknown as nodegit.Error.CODE,
      field: "gpgsig",
      signedData: await gpgSign(key, data),
    };
  };
}
async function amendCommit(parent: nodegit.Commit, committer: nodegit.Signature, message: string, gpgKey?: string): Promise<void> {
  const oid = await index.writeTree();
  const author = parent.author();
  if (gpgKey && currentProfile().gpg) {
    await parent.amendWithSignature(HEAD_REF, author, committer, "utf8", message, oid, onSignature(gpgKey));
  } else {
    await parent.amend(HEAD_REF, author, committer, "utf8", message, oid);
  }
}

export async function doCommit(repo: nodegit.Repository, params: IpcActionParams[IpcAction.COMMIT]): AsyncIpcActionReturnOrError<IpcAction.COMMIT> {
  const profile = currentProfile();
  const committer = signatureFromProfile(profile);
  if (!committer.email()) {
    return Error("No git credentials provided");
  }

  const emptyRepo = repo.isEmpty() || repo.headUnborn();
  if (emptyRepo && params.amend) {
    return Error("Cannot amend in an empty repository");
  }

  const parent = await repo.getHeadCommit();

  try {
    const message = params.message.body ? `${params.message.summary}\n\n${params.message.body}` : params.message.summary;
    const gpgKey = profile.gpg?.commit ? profile.gpg.key : undefined;

    if (params.amend) {
      await amendCommit(parent, committer, message, gpgKey);
    } else {
      const oid = await index.writeTree();
      const parents = emptyRepo ? null : [parent];
      if (gpgKey && currentProfile().gpg) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error `parents` can be null for the "ROOT" commit (empty repository) https://libgit2.org/libgit2/#HEAD/group/commit/git_commit_create
        await repo.createCommitWithSignature(HEAD_REF, committer, committer, message, oid, parents, onSignature(gpgKey));
      } else {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error `parents` can be null. This is fine.
        await repo.createCommit(HEAD_REF, committer, committer, message, oid, parents);
      }
    }
  } catch (err) {
    if (err instanceof Error) {
      return err;
    } else if (typeof err === "string") {
      return Error(err);
    }
    return Error("Unknown error");
  }

  setLastKnownHead((await repo.getHeadCommit()).id());

  return loadCommit(repo, null);
}

export async function createTag(
  repo: nodegit.Repository,
  data: IpcActionParams[IpcAction.CREATE_TAG],
  tagger: nodegit.Signature,
  gpgKey?: string,
): AsyncIpcActionReturnOrError<IpcAction.CREATE_TAG> {
  try {
    let id = data.from;

    if (!data.fromCommit) {
      const ref = await repo.getReference(data.from);
      const refAt = await repo.getReferenceCommit(ref);

      id = refAt.id().tostrS();
    }

    if (gpgKey && currentProfile().gpg) {
      // TODO: Change this when https://github.com/nodegit/nodegit/pull/1945 lands
      await nodegit.Tag.createWithSignature(repo, data.name, id, tagger, data.annotation || "", 0, onSignature(gpgKey));
    } else if (data.annotation) {
      await repo.createTag(id, data.name, data.annotation);
    } else {
      await repo.createLightweightTag(id, data.name);
    }
  } catch (err) {
    if (err instanceof Error) {
      dialog.showErrorBox("Failed to create tag", err.toString());
    }
    return false;
  }

  return true;
}

async function getUnstagedPatches(repo: nodegit.Repository, flags: nodegit.Diff.OPTION): Promise<nodegit.ConvenientPatch[]> {
  const unstagedDiff = await nodegit.Diff.indexToWorkdir(repo, index, {
    flags: DiffOPTION.INCLUDE_UNTRACKED | DiffOPTION.SHOW_UNTRACKED_CONTENT | DiffOPTION.RECURSE_UNTRACKED_DIRS | flags,
  });
  const diffOpts: DiffFindOptions = {
    flags: DiffFIND.RENAMES | DiffFIND.FOR_UNTRACKED,
  };
  await unstagedDiff.findSimilar(diffOpts);
  return unstagedDiff.patches();
}

async function getStagedDiff(repo: nodegit.Repository, flags: nodegit.Diff.OPTION): Promise<nodegit.Diff> {
  if (repo.isEmpty() || repo.headUnborn()) {
    return nodegit.Diff.treeToIndex(repo, undefined, index, { flags });
  }

  const head = await repo.getHeadCommit();
  return nodegit.Diff.treeToIndex(repo, await head.getTree(), index, { flags });
}

async function getStagedPatches(repo: nodegit.Repository, flags: nodegit.Diff.OPTION): Promise<nodegit.ConvenientPatch[]> {
  const stagedDiff = await getStagedDiff(repo, flags);
  const diffOpts: DiffFindOptions = {
    flags: DiffFIND.RENAMES,
  };
  await stagedDiff.findSimilar(diffOpts);
  return stagedDiff.patches();
}

let preventRefreshWorkdir = false;
export function isRefreshingWorkdir() {
  return preventRefreshWorkdir;
}
export async function sendRefreshWorkdirEvent(repo: nodegit.Repository): Promise<void> {
  if (preventRefreshWorkdir) {
    return;
  }
  preventRefreshWorkdir = true;
  const result = await refreshWorkdir(repo);
  if (result instanceof Error) {
    // noop ?
  } else {
    sendEvent(AppEventType.REFRESH_WORKDIR, result);
  }
  preventRefreshWorkdir = false;
}

async function refreshWorkdir(repo: nodegit.Repository): Promise<
  {
    unstaged: number;
    staged: number;
    status: ReturnType<typeof repoStatus>;
  } | Error
> {
  const diffOptions = getAppConfig().diffOptions;

  // FIXME: Verify that this works? Might throw if called to often?
  try {
    await index.read(0);

    let flags = 0;
    if (diffOptions?.ignoreWhitespace) {
      flags |= DiffOPTION.IGNORE_WHITESPACE;
    }

    // TODO: This is slow. Find a better way to determine when to query unstaged changed
    workDirIndexCache.unstagedPatches = await getUnstagedPatches(repo, flags);
    workDirIndexCache.stagedPatches = await getStagedPatches(repo, flags);
    return {
      unstaged: workDirIndexCache.unstagedPatches.length,
      staged: workDirIndexCache.stagedPatches.length,
      status: repoStatus(repo),
    };
  } catch (err) {
    console.log(err);
    if (err instanceof Error) {
      return err;
    }
    return Error();
  }
}

async function stageSingleFile(repo: nodegit.Repository, filePath: string): Promise<boolean> {
  let result;

  try {
    // if fs.access throws the file does not exist on the filesystem
    // and needs to be removed from the index
    await fs.access(join(repo.workdir(), filePath));
    result = await index.addByPath(filePath);
  } catch (_) {
    result = await index.removeByPath(filePath);
  }

  // NOTE: Returns 0 on success
  return !result;
}
export async function stageFile(repo: nodegit.Repository, filePath: string): AsyncIpcActionReturnOrError<IpcAction.STAGE_FILE> {
  await index.read(0);

  const result = await stageSingleFile(repo, filePath);

  if (result) {
    await index.write();
  }

  return result;
}
async function unstageSingleFile(repo: nodegit.Repository, head: nodegit.Commit, filePath: string): Promise<boolean> {
  // NOTE: Returns 0 on success
  return !await nodegit.Reset.default(repo, head, filePath);
}
export async function unstageFile(repo: nodegit.Repository, filePath: string): AsyncIpcActionReturnOrError<IpcAction.UNSTAGE_FILE> {
  const head = await repo.getHeadCommit();
  const result = await unstageSingleFile(repo, head, filePath);

  await index.read(0);

  return result;
}

/**
 * @returns number of staged files
 */
export async function stageAllFiles(repo: nodegit.Repository): Promise<number> {
  const statusList = await repo.getStatus({
    show: StatusSHOW.WORKDIR_ONLY,
    flags: StatusOPT.INCLUDE_UNTRACKED | StatusOPT.RECURSE_UNTRACKED_DIRS,
  });
  await index.read(0);
  await Promise.all(statusList.map(
    statusItem => stageSingleFile(repo, statusItem.path()),
  ));
  await index.write();
  return statusList.length;
}

/**
 * @returns number of unstaged files
 */
export async function unstageAllFiles(repo: nodegit.Repository): Promise<number> {
  const statusList = await repo.getStatus({
    show: StatusSHOW.INDEX_ONLY,
    flags: StatusOPT.INCLUDE_UNTRACKED | StatusOPT.RECURSE_UNTRACKED_DIRS,
  });
  const head = await repo.getHeadCommit();
  await Promise.all(statusList.map(
    statusItem => unstageSingleFile(repo, head, statusItem.path()),
  ));
  await index.read(0);
  return statusList.length;
}

async function discardSingleFile(repo: nodegit.Repository, filePath: string): Promise<true | Error> {
  preventRefreshWorkdir = true;
  if (!index.getByPath(filePath)) {
    // file not found in index (untracked), delete
    try {
      await fs.unlink(join(repo.workdir(), filePath));
    } catch (err) {
      if (err instanceof Error) {
        return err;
      }
    }
    preventRefreshWorkdir = false;
    return true;
  }

  try {
    const head = await repo.getHeadCommit();
    const tree = await head.getTree();
    await nodegit.Checkout.tree(repo, tree, { checkoutStrategy: CheckoutSTRATEGY.FORCE, paths: [filePath] });
  } catch (err) {
    console.error(err);
  }

  preventRefreshWorkdir = false;
  return true;
}
export async function discardChanges(repo: nodegit.Repository, filePath: string): Promise<boolean | Error> {
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
/**
 * @returns Number of discarded changes
 */
export async function discardAllChanges(repo: nodegit.Repository): Promise<number> {
  const statusList = await repo.getStatus({
    show: StatusSHOW.WORKDIR_ONLY,
    flags: StatusOPT.INCLUDE_UNTRACKED | StatusOPT.RECURSE_UNTRACKED_DIRS,
  });
  await Promise.all(statusList.map(
    statusItem => discardSingleFile(repo, statusItem.path()),
  ));
  return statusList.length;
}

export function loadChanges(): IpcActionReturnOrError<IpcAction.GET_CHANGES> {
  workDirIndexPathMap.staged.clear();
  workDirIndexPathMap.unstaged.clear();

  return {
    staged: loadStagedChanges(),
    unstaged: loadUnstagedChanges(),
  };
}
export function loadUnstagedChanges(): PatchObj[] {
  return workDirIndexCache.unstagedPatches.map(convPatch => {
    const patch = handlePatch(convPatch);
    workDirIndexPathMap.unstaged.set(patch.actualFile.path, convPatch);
    return patch;
  });
}
export function loadStagedChanges(): PatchObj[] {
  return workDirIndexCache.stagedPatches.map(convPatch => {
    const patch = handlePatch(convPatch);
    workDirIndexPathMap.staged.set(patch.actualFile.path, convPatch);
    return patch;
  });
}
export async function getWorkdirHunks(repo: nodegit.Repository, path: string, type: "staged" | "unstaged"): Promise<false | HunkObj[]> {
  const patch = workDirIndexPathMap[type].get(path);
  return patch ? await loadHunks(repo, patch, path) : false;
}

function handleLine(line: nodegit.DiffLine): LineObj {
  const oldLineno = line.oldLineno();
  const newLineno = line.newLineno();
  let type: LineObj["type"] = "";
  if (oldLineno === -1) {
    type = "+";
  } else if (newLineno === -1) {
    type = "-";
  }
  return {
    type,
    offset: line.contentOffset(),
    length: line.contentLen(),
    oldLineno,
    newLineno,
    content: line.rawContent().trimEnd(),
  };
}
async function handleHunk(hunk: nodegit.ConvenientHunk): Promise<HunkObj> {
  const lines = await hunk.lines();

  return {
    header: hunk.header().trim(),
    lines: lines.map(handleLine),
    // old: hunk.oldStart(),
    // new: hunk.newStart()
  };
}
export async function getHunks(repo: nodegit.Repository, sha: string, path: string): Promise<false | HunkObj[]> {
  const patch = commitObjectCache.get(sha)?.patches.get(path);
  return patch ? await loadHunks(repo, patch, path) : false;
}
export async function hunksFromCompare(repo: nodegit.Repository, path: string): Promise<false | HunkObj[]> {
  const patch = comparePatches.get(path);
  return patch ? await loadHunks(repo, patch, path) : false;
}

export function getHunksWithParams(repo: nodegit.Repository, params: IpcActionParams[IpcAction.LOAD_HUNKS]): Promise<false | HunkObj[]> {
  if ("sha" in params) {
    return getHunks(repo, params.sha, params.path);
  }
  if ("compare" in params) {
    return hunksFromCompare(repo, params.path);
  }
  return getWorkdirHunks(repo, params.path, params.type);
}

async function loadHunks(repo: nodegit.Repository, patch: nodegit.ConvenientPatch, path?: string): Promise<HunkObj[]> {
  if (patch.isConflicted() && path) {
    return loadConflictedPatch(repo, path);
  }

  const hunks = await patch.hunks();
  return Promise.all(hunks.map(handleHunk));
}

async function commitDiffParent(commit: nodegit.Commit, diffOptions?: DiffOptions): Promise<nodegit.Diff> {
  const tree = await commit.getTree();

  // TODO: which parent to chose?
  const parents = await commit.getParents(1);
  if (parents.length) {
    const parent = parents[0];
    const parentTree = await parent.getTree();

    return await tree.diffWithOptions(parentTree, diffOptions);
  }

  return await tree.diffWithOptions(null, diffOptions);
}

export async function diffFileAtCommit(repo: nodegit.Repository, file: string, sha: string): Promise<Error | PatchObj> {
  const historyEntry = fileHistoryCache.get(sha);
  if (!historyEntry) {
    return Error("Revison not found");
  }
  const commit = historyEntry.commit;
  // FIXME:
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore Cannot use this until Revwalk.fileHistoryWalk() sets repo on returned Commit items.
  commit.repo = repo;

  const pathspec = [file];

  // Find renames
  if (historyEntry.oldName && historyEntry.oldName !== file) {
    pathspec.push(historyEntry.oldName);
  } else if (historyEntry.newName && historyEntry.newName !== file) {
    pathspec.push(historyEntry.newName);
  }

  const diff = await commitDiffParent(commit, {
    pathspec,
    flags: DiffOPTION.IGNORE_WHITESPACE,
  });
  await diff.findSimilar({
    flags: DiffFIND.RENAMES,
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

async function loadConflictedPatch(repo: nodegit.Repository, path: string): Promise<HunkObj[]> {
  const conflictEntry = await index.conflictGet(path || "") as unknown as {
    ancestor_out: nodegit.IndexEntry;
    our_out: nodegit.IndexEntry | null;
    their_out: nodegit.IndexEntry | null;
  };

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

      const lines = content.split("\n").map((line, index): LineObj => ({
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
        content: "",
      },
    ],
  }];
}

export async function resolveConflict(repo: nodegit.Repository, path: string): Promise<boolean> {
  const conflictEntry = await index.conflictGet(path) as unknown as {
    ancestor_out: nodegit.IndexEntry;
    our_out: nodegit.IndexEntry | null;
    their_out: nodegit.IndexEntry | null;
  };

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

function handlePatch(patch: nodegit.ConvenientPatch): PatchObj {
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

async function handleDiff(diff: nodegit.Diff, convPatches: Map<string, nodegit.ConvenientPatch>): Promise<PatchObj[]> {
  const patches = await diff.patches();
  return patches.map(convPatch => {
    const patch = handlePatch(convPatch);
    convPatches.set(patch.actualFile.path, convPatch);
    return patch;
  });
}

export async function getCommitPatches(sha: string, diffOptions?: AppConfig["diffOptions"]): AsyncIpcActionReturnOrError<IpcAction.LOAD_PATCHES_WITHOUT_HUNKS> {
  const commit = commitObjectCache.get(sha);
  if (!commit) {
    return Error("Revison not found");
  }

  let flags = 0;
  if (diffOptions?.ignoreWhitespace) {
    flags |= DiffOPTION.IGNORE_WHITESPACE;
  }

  const diff = await commitDiffParent(commit.commit, { flags });
  await diff.findSimilar({
    flags: DiffFIND.RENAMES,
  });

  return await handleDiff(diff, commit.patches);
}

export async function tryCompareRevisions(repo: nodegit.Repository, revisions: { from: string; to: string; }): Promise<Error | PatchObj[]> {
  try {
    return await compareRevisions(repo, revisions);
  } catch (err) {
    if (err instanceof Error) {
      return err;
    }
  }

  return Error("Unknown error, revisions not found?");
}

export async function compareRevisions(repo: nodegit.Repository, revisions: { from: string; to: string; }): Promise<PatchObj[]> {
  const revFrom = await nodegit.Revparse.single(repo, revisions.from);
  const revTo = await nodegit.Revparse.single(repo, revisions.to);

  // If revisions.{from,to} is a Tag ref we need to "peel" to a commit object
  const fromCommit = await revFrom.peel(ObjectTYPE.COMMIT);
  const toCommit = await revTo.peel(ObjectTYPE.COMMIT);

  const from = await repo.getCommit(fromCommit.id().tostrS());
  const to = await repo.getCommit(toCommit.id().tostrS());

  // TODO: fix this. Merge commits are a bit messy without this.
  const fromTree = await from.getTree();
  const toTree = await to.getTree();

  const diff = await toTree.diff(fromTree);
  await diff.findSimilar({
    flags: DiffFIND.RENAMES | DiffFIND.IGNORE_WHITESPACE,
  });

  const descendant = await nodegit.Graph.descendantOf(repo, to.id(), from.id());
  if (descendant) {
    const revwalk = repo.createRevWalk();
    revwalk.pushRange(`${from.id().tostrS()}~1..${to.id().tostrS()}`);
    const commits = await revwalk.commitWalk(100);

    const history = commits.map(compileHistoryCommit);

    sendAction(IpcAction.LOAD_COMMITS, {
      cursor: history[history.length - 1].sha,
      commits: history,
      branch: "",
    });
  }

  comparePatches.clear();
  return handleDiff(diff, comparePatches);
}

function getCommitObj(commit: nodegit.Commit): CommitObj {
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
      body: msgBody,
    },
    author: {
      name: author.name(),
      email: author.email(),
    },
    committer: {
      name: committer.name(),
      email: committer.email(),
    },
  };
}

export async function loadTreeAtCommit(repo: nodegit.Repository, sha: string): Promise<string[]> {
  const commit = await repo.getCommit(sha);
  const tree = await commit.getTree();

  return tree.getAllFilepaths();
}

export async function loadCommit(repo: nodegit.Repository, sha: string | null): Promise<Error | CommitObj> {
  const commit = sha ? await commitWithDiff(repo, sha) : await repo.getHeadCommit();
  if (commit instanceof Error) {
    // Probably an invalid revspec path
    return commit;
  }

  return getCommitObj(commit);
}

export async function getCommitGpgSign(repo: nodegit.Repository, sha: string): AsyncIpcActionReturnOrError<IpcAction.GET_COMMIT_GPG_SIGN> {
  if (!currentProfile().gpg) {
    return false;
  }

  const commit = await repo.getCommit(sha);

  try {
    const commitSignature = await commit.getSignature("gpgsig");
    return {
      sha,
      signature: await gpgVerify(commitSignature.signature, commitSignature.signedData),
    };
  } catch (_) {
    // Commit is probably not signed.
  }
  return false;
}

export async function parseRevspec(repo: nodegit.Repository, sha: string): Promise<Error | nodegit.Oid> {
  try {
    const revspec = await nodegit.Revparse.single(repo, sha);
    return revspec.id();
  } catch (e) {
    return e as Error;
  }
}

export async function commitWithDiff(repo: nodegit.Repository, sha: string): Promise<Error | nodegit.Commit> {
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

export async function checkoutBranch(repo: nodegit.Repository, branch: string): AsyncIpcActionReturnOrError<IpcAction.CHECKOUT_BRANCH> {
  try {
    // NOTE: `checkoutBranch()` does not return a Reference..
    await repo.checkoutBranch(branch);

    return getHeadStruct(repo);
  } catch (err) {
    return err as Error;
  }
}

export async function openFileAtCommit(repo: nodegit.Repository, data: { file: string; sha: string; }): Promise<boolean> {
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
    if (err instanceof Error) {
      dialog.showErrorBox("Error", err.toString());
    }
    console.error(err);
    return false;
  }
}

let repoStash: StashObj[] = [];
const commitObjectCache: Map<string, {
  commit: nodegit.Commit;
  patches: Map<string, nodegit.ConvenientPatch>;
}> = new Map();
const comparePatches: Map<string, nodegit.ConvenientPatch> = new Map();
const fileHistoryCache: Map<string, nodegit.Revwalk.HistoryEntry> = new Map();
const workDirIndexCache: {
  unstagedPatches: nodegit.ConvenientPatch[];
  stagedPatches: nodegit.ConvenientPatch[];
} = {
  unstagedPatches: [],
  stagedPatches: [],
};
const workDirIndexPathMap: {
  staged: Map<string, nodegit.ConvenientPatch>;
  unstaged: Map<string, nodegit.ConvenientPatch>;
} = {
  staged: new Map(),
  unstaged: new Map(),
};
let index: nodegit.Index;
