import { h, Component } from "preact";
import { sendAsyncMessage, unregisterHandler, registerHandler } from "src/Data/Renderer/IPC";
import { IpcAction, IpcActionReturn, IpcActionReturnError, LoadCommitReturn, IpcActionParams, Locks } from "src/Data/Actions";
import { clearLock, setLock, Store, subscribe } from "src/Data/Renderer/store";

import "./style.css";
import FileFilter from "./FileFilter";
import CommitListItem from "./CommitListItem";
import HeadColors from "./HeadColors";

type State = {
    commits: IpcActionReturn[IpcAction.LOAD_COMMITS]["commits"]
    filter: undefined | string
    fileFilter: undefined | string
    fileResults: string[]
};

const pageSize = 1000;

export default class CommitList extends Component<{}, State> {
    graph: {
        [sha: string]: {
            descendants: LoadCommitReturn[]
            colorId: number
        }
    } = {};
    commits: any = {};
    unsubscribe!: Function;
    cursor: IpcActionReturn[IpcAction.LOAD_COMMITS]["cursor"];
    color: number = 0;

    constructor() {
        super();
        this.state = {
            commits: [],
            fileFilter: undefined,
            filter: undefined,
            fileResults: [],
        };
    }

    componentWillMount() {
        this.unsubscribe = subscribe(this.handleProps, "selectedBranch");
        registerHandler(IpcAction.LOAD_COMMITS, this.commitsLoaded);
        registerHandler(IpcAction.LOAD_COMMITS_PARTIAL, this.commitsLoaded);
        this.getCommits();
    }
    componentWillUnmount() {
        this.unsubscribe();
        unregisterHandler(IpcAction.LOAD_COMMITS, this.commitsLoaded);
        unregisterHandler(IpcAction.LOAD_COMMITS_PARTIAL, this.commitsLoaded);
    }
    handleProps = () => {
        this.commits = {};
        this.cursor = undefined;
        this.color = 0;
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
                num: pageSize,
                history: true,
            };
        } else {
            options = {
                num: pageSize,
                branch: Store.selectedBranch.branch || "HEAD",
            };
        }
        if (this.state.fileFilter) {
            options.file = this.state.fileFilter;
        }

        sendAsyncMessage(IpcAction.LOAD_COMMITS, {
            cursor: this.cursor,
            ...options
        });
    }
    handleCommits(fetched: IpcActionReturn[IpcAction.LOAD_COMMITS_PARTIAL]) {
        if (fetched.branch === "history") {
            if (!Store.selectedBranch.history) {
                return;
            }
        } else if (fetched.branch !== Store.selectedBranch.branch) {
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
    filter = (e: any) => {
        e.target.value !== this.state.filter && this.setState({
            filter: e.target.value.toLocaleLowerCase()
        });
    }
    filterByFile = (file: string) => {
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
                <ul>
                    {this.state.commits.length ? this.filterCommits().map((commit) => <CommitListItem key={commit.sha} graph={this.graph} commit={commit} commits={this.commits} />) : "No commits yet?"}
                </ul>
                {!Store.selectedBranch.history ? <button onClick={() => this.loadMoreCommits()}>Load more...</button> : null}
            </div>
        );
    }
}
