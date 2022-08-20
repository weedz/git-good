import { h } from "preact";
import { ipcSendMessage } from "../../Data/IPC";
import { IpcAction, IpcActionReturn, LoadCommitReturn, IpcActionParams, Locks } from "../../../Common/Actions";
import { clearLock, openFileHistory, PureStoreComponent, setLock, Store, StoreType } from "../../Data/store";

import "./style.css";
import FileFilter from "./FileFilter";
import HeadColors from "./HeadColors";
import { Links } from "../LinkContainer";
import CommitContainer from "./CommitContainer";
import { GlobalLinks } from "../Link";
import { filterCommit } from "../../Data/Utility";

type State = {
    filter: undefined | string
    fileResults: string[]
    loading: boolean
};

const pageSize = 200;
const historyLimit = 2000;

export default class CommitList extends PureStoreComponent<unknown, State> {
    graph: {
        [sha: string]: {
            descendants: LoadCommitReturn[]
            colorId: number
        }
    } = {};
    cursor: IpcActionReturn[IpcAction.LOAD_COMMITS]["cursor"];
    color = 0;

    state: State = {
        filter: undefined,
        fileResults: [],
        loading: false,
    };

    commits: IpcActionReturn[IpcAction.LOAD_COMMITS]["commits"] = [];

    componentDidMount() {
        this.listen("selectedBranch", this.selectedBranch);
        this.listen("branches", this.branchesUpdated);
        this.registerHandler(IpcAction.LOAD_COMMITS, this.commitsLoaded);

        this.listen("locks", locks => {
            if (Store.locks[Locks.COMMIT_LIST] !== locks[Locks.COMMIT_LIST]) {
                this.forceUpdate();
            }
        });

        this.getCommits(Store.selectedBranch);
    }
    selectedBranch = (selection: StoreType["selectedBranch"]) => {
        this.handleProps(selection);
    }
    branchesUpdated = () => {
        this.handleProps(Store.selectedBranch);
    }
    handleProps = (selection: StoreType["selectedBranch"]) => {
        this.cursor = undefined;
        this.color = 0;
        this.getCommits(selection);
    }
    getCommits = (selection: StoreType["selectedBranch"]) => {
        GlobalLinks.commits = {};
        this.graph = {};
        this.commits = [];
        if (!this.state.loading) {
            this.loadMoreCommits(selection);
        } else {
            console.log("Already loading commits...");
        }
    }
    loadMoreCommits = (selection: StoreType["selectedBranch"]) => {
        setLock(Locks.BRANCH_LIST);
        let options: IpcActionParams[IpcAction.LOAD_COMMITS];
        if (selection.history) {
            options = {
                num: historyLimit,
                history: true,
            };
        } else {
            options = {
                num: pageSize,
                branch: selection.branch || "HEAD",
            };
        }

        if (this.cursor) {
            options.cursor = this.cursor;
        }

        this.setState({
            loading: true
        });

        ipcSendMessage(IpcAction.LOAD_COMMITS, options);
    }
    handleCommits(fetched: IpcActionReturn[IpcAction.LOAD_COMMITS]) {
        if (fetched.branch === "history") {
            if (!Store.selectedBranch.history) {
                return;
            }
        } else if (fetched.branch && fetched.branch !== Store.selectedBranch.branch) {
            return;
        }

        for (const commit of fetched.commits) {
            if (!this.graph[commit.sha]) {
                this.graph[commit.sha] = {
                    colorId: this.color++ % HeadColors.length,
                    descendants: [],
                };
            }
            for (let i = 0; i < commit.parents.length; i++) {
                const parent = commit.parents[i];
                if (!this.graph[parent]) {
                    this.graph[parent] = {
                        descendants: [],
                        colorId: i === 0 ? this.graph[commit.sha].colorId : this.color++ % HeadColors.length,
                    };
                }
                this.graph[parent].descendants.push(commit);
            }
        }

        // sent on last event
        if ("cursor" in fetched) {
            clearLock(Locks.BRANCH_LIST);
            this.cursor = fetched.cursor;

            this.setState({
                loading: false,
            });
        }
    }
    commitsLoaded = (result: IpcActionReturn[IpcAction.LOAD_COMMITS]) => {
        this.commits = this.commits.concat(result.commits);
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
            <div id="commits-pane" className={`pane${Store.locks[Locks.COMMIT_LIST] ? " disabled" : ""}`}>
                <h4>Commits</h4>
                <div style="padding: 5px 0; border-bottom: 1px solid #555;">
                    <input type="text" value={this.state.filter} onKeyUp={this.filter} placeholder="sha,message" />
                    <FileFilter filterByFile={this.filterByFile} />
                </div>
                <Links.Provider value="commits">
                    {this.commits.length ? <CommitContainer commits={this.filterCommits()} graph={this.graph} /> : "No commits yet?"}
                    {!Store.selectedBranch.history && <button onClick={() => this.loadMoreCommits(Store.selectedBranch)} disabled={!!Store.locks[Locks.BRANCH_LIST]}>Load more...</button>}
                </Links.Provider>
            </div>
        );
    }
}
