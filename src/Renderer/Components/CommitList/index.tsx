import { Fragment, type h } from "preact";

import type { IpcActionParams, IpcResponse, LoadCommitReturn, LoadCommitsReturn } from "../../../Common/Actions.js";
import { IpcAction, Locks } from "../../../Common/Actions.js";
import { HISTORY_REF } from "../../../Common/Branch.js";
import { LinkTypes } from "../../../Common/WindowEventTypes.js";
import { ipcSendMessage } from "../../Data/IPC.js";
import { clearLock, lockChanged, PureStoreComponent, setLock, Store, type StoreType } from "../../Data/store.js";
import { filterCommit } from "../../Data/Utility.js";
import { Links } from "../LinkContainer.js";
import CommitContainer from "./CommitContainer.js";
import FileFilter from "./FileFilter/index.js";
import HeadColors from "./HeadColors.js";
import "./style.css";

type State = {
    filter: undefined | string;
    fileResults: string[];
};

const pageSize = 200;
const historyLimit = 2000;

class CommitList extends PureStoreComponent<unknown, State> {
    graph: Map<string, {
        descendants: LoadCommitReturn[];
        colorId: number;
    }> = new Map();
    cursor: string | null = null;
    color = 0;
    canFetchMore = true;
    loading = false;

    state: State = {
        filter: undefined,
        fileResults: [],
    };

    commits: LoadCommitsReturn["commits"] = [];

    componentDidMount() {
        this.listen("selectedBranch", (selection) => {
            if (selection && selection !== Store.selectedBranch) {
                this.selectedBranch(selection);
            }
        });
        this.listen("branches", (branches) => {
            branches && this.selectedBranch(Store.selectedBranch);
        });
        this.registerHandler(IpcAction.LOAD_COMMITS, this.commitsLoaded);
    }

    resetCommitList() {
        this.cursor = null;
        this.color = 0;
        this.canFetchMore = true;
        this.graph.clear();
        this.commits = [];
    }

    selectedBranch(selection: StoreType["selectedBranch"]) {
        this.resetCommitList();
        if (selection) {
            this.loadMoreCommits(selection);
        }
    }
    loadMoreCommits(selection: StoreType["selectedBranch"]) {
        if (!this.canFetchMore || this.loading) {
            return;
        }
        this.loading = true;

        setLock(Locks.BRANCH_LIST);
        let options: IpcActionParams[IpcAction.LOAD_COMMITS];
        if (selection === HISTORY_REF) {
            options = {
                num: historyLimit,
                history: true,
            };
        } else {
            options = {
                num: pageSize,
                branch: selection || "refs/HEAD",
            };
        }

        if (this.cursor) {
            options.cursor = this.cursor;
        }

        ipcSendMessage(IpcAction.LOAD_COMMITS, options);
    }
    handleCommits(fetched: IpcResponse<IpcAction.LOAD_COMMITS>) {
        if (!fetched || fetched instanceof Error) {
            return;
        }

        if (fetched.commits.length === 0) {
            this.canFetchMore = false;
        }
        if (fetched.branch && fetched.branch !== Store.selectedBranch) {
            return;
        }

        for (let i = 0, len = fetched.commits.length; i < len; ++i) {
            const commit = fetched.commits[i];
            let graphCommit = this.graph.get(commit.sha);
            if (!graphCommit) {
                graphCommit = {
                    colorId: this.color++ % HeadColors.length,
                    descendants: [],
                };
                this.graph.set(commit.sha, graphCommit);
            }
            for (let j = 0, lenParents = commit.parents.length; j < lenParents; j++) {
                let graphParent = this.graph.get(commit.parents[j]);
                if (!graphParent) {
                    graphParent = {
                        descendants: [],
                        colorId: j === 0 ? graphCommit.colorId : this.color++ % HeadColors.length,
                    };
                    this.graph.set(commit.parents[j], graphParent);
                }
                graphParent.descendants.push(commit);
            }
        }

        this.cursor = fetched.cursor;
        this.forceUpdate();
    }
    commitsLoaded = (result: IpcResponse<IpcAction.LOAD_COMMITS>) => {
        clearLock(Locks.BRANCH_LIST);
        this.loading = false;
        if (!result || result instanceof Error) {
            return;
        }
        if (result.branch === Store.selectedBranch) {
            this.commits.push(...result.commits);
        } else {
            this.resetCommitList();
            this.commits = result.commits;
        }

        this.handleCommits(result);
    };
    filter = (e: h.JSX.TargetedInputEvent<HTMLInputElement>) => {
        const filterValue = e.currentTarget.value.toLocaleLowerCase();
        if (filterValue !== this.state.filter) {
            this.setState({ filter: filterValue });
        }
    };

    filterCommits() {
        const filter = this.state.filter;
        if (filter) {
            return this.commits.filter(commit => filterCommit(filter, commit));
        }
        return this.commits;
    }

    render() {
        return (
            <Fragment>
                <div style="padding: 5px 0; border-bottom: 1px solid #555;">
                    <input type="text" onInput={this.filter} placeholder="sha,message" />
                    <FileFilter />
                </div>
                <Links.Provider value={LinkTypes.COMMITS}>
                    {this.commits.length
                        ? (
                            <CommitContainer
                                loadMore={() => Store.selectedBranch !== HISTORY_REF && this.loadMoreCommits(Store.selectedBranch)}
                                commits={this.filterCommits()}
                                graph={this.graph}
                            />
                        )
                        : "No commits yet?"}
                </Links.Provider>
            </Fragment>
        );
    }
}

export default class CommitListWrapper extends PureStoreComponent {
    componentDidMount(): void {
        this.listen("locks", locks => {
            if (lockChanged(Locks.COMMIT_LIST, locks)) {
                this.forceUpdate();
            }
        });
    }

    render() {
        return (
            <div id="commits-pane" class={`pane${Store.locks[Locks.COMMIT_LIST] ? " disabled" : ""}`}>
                <CommitList />
            </div>
        );
    }
}
