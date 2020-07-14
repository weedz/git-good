import { h, Component } from "preact";
import { Link, StaticLink } from "@weedzcokie/router-tsx";
import { sendAsyncMessage, unregisterHandler, registerHandler } from "src/Data/Renderer";
import { IpcAction, IpcActionReturn, IpcActionReturnError, LoadCommitReturn, IpcActionParams } from "src/Data/Actions";
import { Store } from "src/Data/Renderer/store";
import { showCommitMenu } from "./Menu";

import "./style.css";
import FileFilter from "./FileFilter";

type Props = {
    branch?: string
    sha?: string
    history?: boolean
};
type State = {
    commits: IpcActionReturn[IpcAction.LOAD_COMMITS]
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

export default class CommitList extends Component<Props, State> {
    graph: {
        [key: string]: {
            descendants: LoadCommitReturn[]
            colorId: number
        }
    } = {};

    componentWillMount() {
        registerHandler(IpcAction.LOAD_COMMITS, this.commitsLoaded);
        registerHandler(IpcAction.LOAD_COMMITS_PARTIAL, this.commitsLoaded);
        this.handleProps(this.props, true);
    }
    componentWillUnmount() {
        unregisterHandler(IpcAction.LOAD_COMMITS, this.commitsLoaded);
        unregisterHandler(IpcAction.LOAD_COMMITS_PARTIAL, this.commitsLoaded);
    }
    componentWillReceiveProps(nextProps: Props) {
        this.handleProps(nextProps, false);
    }
    handleProps(props: Props, reload: boolean) {
        if (props.history) {
            if (reload || !this.props.history) {
                this.getCommits({
                    num: 1000,
                    history: true
                });
            }
        } else if (!props.sha) {
            if (reload || this.props.branch !== props.branch) {
                this.getCommits({
                    branch: decodeURIComponent(props.branch || "HEAD"),
                });
            }
        } else {
            // sendAsyncMessage(IPCAction.LOAD_COMMITS, {
            //     sha: decodeURIComponent(props.sha)
            // });
        }
    }
    getCommits = (options: IpcActionParams[IpcAction.LOAD_COMMITS]) => {
        this.graph = {};
        this.setState({
            commits: [],
        });
        sendAsyncMessage(IpcAction.LOAD_COMMITS, options);
    }
    handleCommits(commits: IpcActionReturn[IpcAction.LOAD_COMMITS_PARTIAL]) {
        let color = 0;
        for (const commit of commits) {
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
        this.setState({
            commits: this.state.commits.concat(commits),
        });
    }
    commitsLoaded = (result: IpcActionReturn[IpcAction.LOAD_COMMITS] | IpcActionReturnError) => {
        console.log("commits loaded");
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
        });
        // TODO: refactor this.
        if (this.props.history) {
            this.getCommits({
                history: true,
                file,
            });
        } else {
            this.getCommits({
                branch: decodeURIComponent(this.props.branch || "HEAD"),
                file,
            });
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
    commitItem(commit: LoadCommitReturn) {
        return (
            <li class="short" key={commit.sha} data-sha={commit.sha} onContextMenu={showCommitMenu}>
                <span className="graph-indicator" style={{backgroundColor: headColors[this.graph[commit.sha].colorId]}}></span>
                {
                    this.graph[commit.sha].descendants.length > 0 && <ul class="commit-graph">
                        {this.graph[commit.sha].descendants.map(child => <li><StaticLink style={{color: headColors[this.graph[child.sha].colorId]}} href={ (this.props.branch ? `/branch/${this.props.branch}/` : "/commit/") + child.sha}>{child.sha.substring(0,7)}</StaticLink></li>)}
                    </ul>
                }
                <Link activeClassName="selected" href={ (this.props.branch ? `/branch/${this.props.branch}/` : "/commit/") + commit.sha}>
                    {Store.heads[commit.sha] && 
                        Store.heads[commit.sha].map(ref => <span style={{color: headColors[this.graph[commit.sha].colorId]}}>({ref.normalizedName})</span>)
                    }
                    <span class="msg">{commit.message.substring(0, commit.message.indexOf("\n")>>>0 || 60)}</span>
                </Link>
            </li>
        );
    }
    render() {
        return (
            <div id="commits-pane" class="pane">
                <h4>Commits</h4>
                <div>
                    <input type="text" value={this.state.filter} onKeyUp={this.filter} placeholder="sha,message" />
                    <FileFilter filterByFile={this.filterByFile} />
                </div>
                <ul>
                    {this.state.commits?.length && this.filterCommits().map((commit) => this.commitItem(commit))}
                </ul>
            </div>
        );
    }
}