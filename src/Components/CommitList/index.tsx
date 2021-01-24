import { h } from "preact";
import { PureComponent } from "preact/compat";
import { sendAsyncMessage, unregisterHandler, registerHandler } from "src/Data/Renderer/IPC";
import { IpcAction, IpcActionReturn, IpcActionReturnError, LoadCommitReturn, IpcActionParams, Locks } from "src/Data/Actions";
import { clearLock, GlobalLinks, setLock, Store, StoreType, subscribe, unsubscribe } from "src/Data/Renderer/store";

import "./style.css";
import FileFilter from "./FileFilter";
import HeadColors from "./HeadColors";
import { Links } from "../LinkContainer";
import CommitContainer from "./CommitContainer";

type State = {
    commits: IpcActionReturn[IpcAction.LOAD_COMMITS]["commits"]
    filter: undefined | string
    fileFilter: undefined | string
    fileResults: string[]
};

const pageSize = 200;
const historyLimit = 1000;

export default class CommitList extends PureComponent<unknown, State> {
    graph: {
        [sha: string]: {
            descendants: LoadCommitReturn[]
            colorId: number
        }
    } = {};
    cursor: IpcActionReturn[IpcAction.LOAD_COMMITS]["cursor"];
    color = 0;

    constructor() {
        super();
        this.state = {
            commits: [],
            fileFilter: undefined,
            filter: undefined,
            fileResults: [],
        };
    }

    componentDidMount() {
        subscribe(this.checkLocks, "locks");
        subscribe(this.handleProps, "selectedBranch");
        registerHandler(IpcAction.LOAD_COMMITS, this.commitsLoaded);
        this.getCommits();
    }
    componentWillUnmount() {
        unsubscribe(this.checkLocks, "locks");
        unsubscribe(this.handleProps, "selectedBranch");
        unregisterHandler(IpcAction.LOAD_COMMITS, this.commitsLoaded);
    }
    checkLocks = (locks: StoreType["locks"]) => {
        if (Locks.BRANCH_LIST in locks) {
            this.setState({});
        }
    }
    handleProps = () => {
        GlobalLinks.commits = {};
        this.cursor = undefined;
        this.color = 0;
        // TODO: fix this, no need to re-render all commits
        this.setState({
            commits: [],
        }, this.getCommits);
    }
    getCommits = () => {
        this.graph = {};
        this.loadMoreCommits();
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
        if (this.state.fileFilter) {
            options.num = 5000;
            options.file = this.state.fileFilter;
        }

        sendAsyncMessage(IpcAction.LOAD_COMMITS, {
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
            commits: this.state.commits.concat(fetched.commits)
        });
    }
    commitsLoaded = (result: IpcActionReturn[IpcAction.LOAD_COMMITS] | IpcActionReturnError) => {
        if ("error" in result) {
            console.warn(result);
            return;
        }
        this.handleCommits(result);
    }
    filter = (e: h.JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
        e.currentTarget.value !== this.state.filter && this.setState({
            filter: e.currentTarget.value.toLocaleLowerCase()
        });
    }
    filterByFile = (file: string | undefined) => {
        this.setState({
            fileFilter: file,
        }, this.handleProps);
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
            <div id="commits-pane" className="pane">
                <h4>Commits</h4>
                <div>
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
