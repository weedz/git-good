import { h } from "preact";
import { ipcSendMessage } from "src/Data/Renderer/IPC";
import { IpcAction, IpcActionReturn, LoadCommitReturn, IpcActionParams, Locks } from "src/Data/Actions";
import { clearLock, openFileHistory, PureStoreComponent, setLock, Store } from "src/Data/Renderer/store";

import "./style.css";
import FileFilter from "./FileFilter";
import HeadColors from "./HeadColors";
import { Links } from "../LinkContainer";
import CommitContainer from "./CommitContainer";
import { GlobalLinks } from "../Link";

type State = {
    commits: IpcActionReturn[IpcAction.LOAD_COMMITS]["commits"]
    filter: undefined | string
    fileResults: string[]
    loading: boolean
};

const pageSize = 200;
const historyLimit = 1000;

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
        commits: [],
        filter: undefined,
        fileResults: [],
        loading: false,
    };

    componentDidMount() {
        this.listen("selectedBranch", this.handleProps);
        this.listen("branches", this.handleProps);
        this.registerHandler(IpcAction.LOAD_COMMITS, this.commitsLoaded);

        this.listen("locks", locks => {
            if (Store.locks[Locks.COMMIT_LIST] !== locks[Locks.COMMIT_LIST]) {
                this.forceUpdate();
            }
        });

        this.getCommits();
    }
    handleProps = () => {
        GlobalLinks.commits = {};
        this.cursor = undefined;
        this.color = 0;
        this.getCommits();
    }
    getCommits = () => {
        this.graph = {};
        if (!this.state.loading) {
            this.setState({
                // TODO: fix this, no need to re-render all commits
                loading: true,
                commits: [],
            }, this.loadMoreCommits);
        } else {
            console.log("Already loading commits...");
        }
    }
    loadMoreCommits = () => {
        setLock(Locks.BRANCH_LIST);
        let options: IpcActionParams[IpcAction.LOAD_COMMITS];
        if (Store.selectedBranch.history) {
            options = {
                num: historyLimit,
                history: true,
            };
        } else {
            options = {
                num: pageSize,
                branch: Store.selectedBranch.branch || "HEAD",
            };
        }

        ipcSendMessage(IpcAction.LOAD_COMMITS, {
            cursor: this.cursor,
            ...options
        });
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
        if (fetched.cursor) {
            clearLock(Locks.BRANCH_LIST);
            this.cursor = fetched.cursor;
        }

        this.setState({
            commits: this.state.commits.concat(fetched.commits),
            loading: false,
        });
    }
    commitsLoaded = (result: IpcActionReturn[IpcAction.LOAD_COMMITS]) => {
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
            return this.state.commits.filter((commit) =>
                commit.sha.toLocaleLowerCase().includes(filter)
                || commit.message.toLocaleLowerCase().includes(filter)
            );
        }
        return this.state.commits;
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
                    {this.state.commits.length ? <CommitContainer commits={this.filterCommits()} graph={this.graph} /> : "No commits yet?"}
                    {!Store.selectedBranch.history && <button onClick={() => this.loadMoreCommits()} disabled={!!Store.locks[Locks.BRANCH_LIST]}>Load more...</button>}
                </Links.Provider>
            </div>
        );
    }
}
