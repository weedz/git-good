import { h, Component } from "preact";
import { sendAsyncMessage, unregisterHandler, registerHandler } from "src/Data/Renderer/IPC";
import { IpcAction, IpcActionReturn, IpcActionReturnError, LoadCommitReturn, IpcActionParams } from "src/Data/Actions";
import { setState, Store, subscribe } from "src/Data/Renderer/store";
import { showCommitMenu } from "./Menu";

import "./style.css";
import FileFilter from "./FileFilter";
import Link from "../Link";

type Props = {
    branch?: string
    sha?: string
    history?: boolean
};
type State = {
    fetched: IpcActionReturn[IpcAction.LOAD_COMMITS]
    filter: undefined | string
    fileFilter: undefined | string
    fileResults: string[]
};

const headColors = [
    "cyan",
    "red",
    "lightgreen",
    "pink",
    "teal",
    "darkslategrey",
    "yellow",
    "darkviolet",
    "orange",
    "hotpink",
    "sienna",
    "springgreen",
    "deeppink",
    "limegreen",
    "fuchsia",
    "gold",
    "crimson",
    "antiquewhite",
];

const pageSize = 1000;

export default class CommitList extends Component<Props, State> {
    graph: {
        [sha: string]: {
            descendants: LoadCommitReturn[]
            colorId: number
        }
    } = {};
    commits: any = {};
    unsubscribe!: Function;

    constructor() {
        super();
        this.state = {
            fetched: {
                commits: [],
                branch: ""
            },
            fileFilter: undefined,
            filter: undefined,
            fileResults: [],
        };
    }

    componentWillMount() {
        this.unsubscribe = subscribe(this.handleProps, "selectedBranch");
        registerHandler(IpcAction.LOAD_COMMITS, this.commitsLoaded);
        registerHandler(IpcAction.LOAD_COMMITS_PARTIAL, this.commitsLoaded);
        this.getCommits({branch: "HEAD"});
    }
    componentWillUnmount() {
        this.unsubscribe();
        unregisterHandler(IpcAction.LOAD_COMMITS, this.commitsLoaded);
        unregisterHandler(IpcAction.LOAD_COMMITS_PARTIAL, this.commitsLoaded);
    }
    handleProps = (props: Props = this.props) => {
        this.graph = {};
        this.commits = {};
        this.setState({
            fetched: {
                commits: [],
                branch: ""
            },
        }, () => this.getCommits(props));
    }
    getCommits = (props: Props = this.props) => {
        let options: IpcActionParams[IpcAction.LOAD_COMMITS];
        if (props.history) {
            options = {
                num: pageSize,
                history: true,
            };
        } else {
            options = {
                num: pageSize,
                branch: props.branch || "HEAD",
            };
        }
        if (this.state.fileFilter) {
            options.file = this.state.fileFilter;
        }

        sendAsyncMessage(IpcAction.LOAD_COMMITS, {
            cursor: this.state.fetched.commits.length ? this.state.fetched.commits[this.state.fetched.commits.length - 1].sha : undefined,
            ...options
        });
    }
    handleCommits(fetched: IpcActionReturn[IpcAction.LOAD_COMMITS_PARTIAL]) {
        if (fetched.branch === "history") {
            if (!Store.selectedBranch.history) {
                return;
            }
        } else if (fetched.branch !== Store.selectedBranch.branch) {
            return
        }

        let color = 0;
        for (const commit of fetched.commits) {
            if (!this.graph[commit.sha]) {
                this.graph[commit.sha] = {
                    colorId: color++ % headColors.length,
                    descendants: [],
                };
            }
            for (let i = 0; i < commit.parents.length; i++) {
                const parent = commit.parents[i];
                if (!this.graph[parent]) {
                    this.graph[parent] = {
                        descendants: [],
                        colorId: i === 0 ? this.graph[commit.sha].colorId : color++ % headColors.length,
                    };
                }
                this.graph[parent].descendants.push(commit);
            }
        }

        const stateFetched = this.state.fetched;
        stateFetched.commits = this.state.fetched.commits.concat(fetched.commits)
        this.setState({
            fetched: stateFetched
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
            return this.state.fetched.commits.filter((commit) =>
                commit.sha.toLocaleLowerCase().includes(filter)
                || commit.message.toLocaleLowerCase().includes(filter)
            );
        }
        return this.state.fetched.commits;
    }
    commitItem(commit: LoadCommitReturn) {
        const commitLink = (
            <Link selectAction={(c) => setState({diffPaneSrc: c.props.linkData})} activeClassName="selected" linkData={commit.sha}>
                {Store.heads[commit.sha] && 
                    Store.heads[commit.sha].map(ref => <span style={{color: headColors[this.graph[commit.sha].colorId]}}>({ref.normalizedName})</span>)
                }
                <span className="msg">{commit.message.substring(0, commit.message.indexOf("\n")>>>0 || 60)}</span>
            </Link>
        );
        this.commits[commit.sha] = commitLink;

        return (
            <li className="short" key={commit.sha} data-sha={commit.sha} onContextMenu={showCommitMenu}>
                <span className="graph-indicator" style={{backgroundColor: headColors[this.graph[commit.sha].colorId]}}></span>
                {
                    this.graph[commit.sha].descendants.length > 0 && <ul className="commit-graph">
                        {this.graph[commit.sha].descendants.map(child => <li><Link selectTarget={this.commits[child.sha]} style={{color: headColors[this.graph[child.sha].colorId]}}>{child.sha.substring(0,7)}</Link></li>)}
                    </ul>
                }
                {commitLink}
            </li>
        );
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
                    {this.state.fetched.commits.length && this.filterCommits().map((commit) => this.commitItem(commit))}
                </ul>
                <button onClick={() => this.getCommits()}>Load more...</button>
            </div>
        );
    }
}
