import { h } from "preact";
import { ipcSendMessage } from "../../Data/IPC";
import { IpcAction, IpcActionReturn, LoadCommitReturn, IpcActionParams, Locks, IpcResponse, LoadCommitsReturn } from "../../../Common/Actions";
import { clearLock, lockChanged, PureStoreComponent, setLock, Store, StoreType } from "../../Data/store";

import "./style.css";
import FileFilter from "./FileFilter";
import HeadColors from "./HeadColors";
import { Links } from "../LinkContainer";
import CommitContainer from "./CommitContainer";
import { filterCommit } from "../../Data/Utility";
import { openFileHistory } from "../../Data";
import { HISTORY_REF } from "../../../Common/Branch";

type State = {
    filter: undefined | string
    fileResults: string[]
};

const pageSize = 200;
const historyLimit = 2000;

export default class CommitList extends PureStoreComponent<unknown, State> {
    graph: Map<string, {
        descendants: LoadCommitReturn[]
        colorId: number
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
        this.listen("locks", locks => {
            if (lockChanged(Locks.COMMIT_LIST, locks)) {
                this.forceUpdate();
            }
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

    selectedBranch = (selection: StoreType["selectedBranch"]) => {
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

        for (const commit of fetched.commits) {
            let graphCommit = this.graph.get(commit.sha);
            if (!graphCommit) {
                graphCommit = {
                    colorId: this.color++ % HeadColors.length,
                    descendants: [],
                };
                this.graph.set(commit.sha, graphCommit);
            }
            for (let i = 0; i < commit.parents.length; i++) {
                let graphParent = this.graph.get(commit.parents[i]);
                if (!graphParent) {
                    graphParent = {
                        descendants: [],
                        colorId: i === 0 ? graphCommit.colorId : this.color++ % HeadColors.length,
                    };
                    this.graph.set(commit.parents[i], graphParent);
                }
                graphParent.descendants.push(commit);
            }
        }

        this.cursor = fetched.cursor;
        this.forceUpdate();
    }
    commitsLoaded = (result: IpcActionReturn[IpcAction.LOAD_COMMITS]) => {
        clearLock(Locks.BRANCH_LIST);
        this.loading = false;
        if (!result) {
            return;
        }
        if (result.branch === Store.selectedBranch) {
            this.commits.push(...result.commits)
        } else {
            this.resetCommitList();
            this.commits = result.commits;
        }

        this.handleCommits(result);
    }
    filter = (e: h.JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
        e.currentTarget.value !== this.state.filter && this.setState({
            filter: e.currentTarget.value.toLocaleLowerCase()
        });
    }
    filterByFile = (file: string | undefined) => {
        if (file) {
            openFileHistory(file);
        }
    }
    
    filterCommits() {
        const filter = this.state.filter;
        if (filter) {
            return this.commits.filter(commit => filterCommit(filter, commit));
        }
        return this.commits;
    }

    render() {
        return (
            <div id="commits-pane" class={`pane${Store.locks[Locks.COMMIT_LIST] ? " disabled" : ""}`}>
                <h4>Commits</h4>
                <div style="padding: 5px 0; border-bottom: 1px solid #555;">
                    <input type="text" value={this.state.filter} onKeyUp={this.filter} placeholder="sha,message" />
                    <FileFilter filterByFile={this.filterByFile} />
                </div>
                <Links.Provider value="commits">
                    {
                        this.commits.length
                            ? <CommitContainer
                                loadMore={() => Store.selectedBranch !== HISTORY_REF && this.loadMoreCommits(Store.selectedBranch)}
                                commits={this.filterCommits()}
                                graph={this.graph} />
                            : "No commits yet?"
                    }
                </Links.Provider>
            </div>
        );
    }
}
