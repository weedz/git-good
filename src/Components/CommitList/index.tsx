import { h, Component } from "preact";
import { Link, StaticLink } from "@weedzcokie/router-tsx";
import { sendAsyncMessage, unregisterHandler, registerHandler } from "src/Data/Renderer";
import { IpcAction, IpcActionReturn, IpcActionReturnError, LoadCommitReturn } from "src/Data/Actions";
import { Store } from "src/Data/Renderer/store";
import { showCommitMenu } from "./Menu";

import "./style.css";

type Props = {
    branch?: string
    sha?: string
    history?: boolean
};
type State = {
    commits: IpcActionReturn[IpcAction.LOAD_COMMITS]
    filter: string
    filterFile: string
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
            commit: LoadCommitReturn[]
            colorId: number
        }
    } = {};
    fileHistoryTimeout: any;
    componentWillMount() {
        registerHandler(IpcAction.LOAD_COMMITS, this.commitsLoaded);
        this.handleProps(this.props, true);
    }
    componentWillUnmount() {
        unregisterHandler(IpcAction.LOAD_COMMITS, this.commitsLoaded);
        clearTimeout(this.fileHistoryTimeout);
    }
    componentWillReceiveProps(nextProps: Props) {
        this.handleProps(nextProps, false);
    }
    handleProps(props: Props, reload: boolean) {
        if (props.history) {
            if (reload || !this.props.history) {
                sendAsyncMessage(IpcAction.LOAD_COMMITS, {
                    num: 1000,
                    history: true
                });
            }
        } else if (!props.sha) {
            if (reload || this.props.branch !== props.branch) {
                sendAsyncMessage(IpcAction.LOAD_COMMITS, {
                    branch: decodeURIComponent(props.branch || "HEAD"),
                });
            }
        } else {
            // sendAsyncMessage(IPCAction.LOAD_COMMITS, {
            //     sha: decodeURIComponent(props.sha)
            // });
        }
    }
    commitsLoaded = (commits: IpcActionReturn[IpcAction.LOAD_COMMITS] | IpcActionReturnError) => {
        console.log("commits loaded");
        this.graph = {};
        if ("error" in commits) {
            console.warn(commits);
            return;
        }
        let color = 0;
        for (const commit of commits) {
            if (!this.graph[commit.sha]) {
                this.graph[commit.sha] = {
                    colorId: color++ % headColors.length,
                    commit: [],
                };
            }
            
            for (const parent of commit.parents) {
                if (!this.graph[parent]) {
                    this.graph[parent] = {
                        commit: [],
                        colorId: color++ % headColors.length
                    };
                }
                this.graph[parent].commit.push(commit);
            }
        }
        this.setState({
            commits
        });
    }
    filter = (e: any) => {
        e.target.value !== this.state.filter && this.setState({
            filter: e.target.value.toLocaleLowerCase()
        });
    }
    filterFile = (e: any) => {
        if (e.target.value === this.state.filterFile) {
            return;
        }

        this.setState({
            filterFile: e.target.value
        });

        clearTimeout(this.fileHistoryTimeout);
        this.fileHistoryTimeout = setTimeout(() => {
            // TODO: refactor this.
            if (this.props.history) {
                sendAsyncMessage(IpcAction.LOAD_COMMITS, {
                    history: true,
                    file: e.target.value,
                });
            } else {
                sendAsyncMessage(IpcAction.LOAD_COMMITS, {
                    branch: decodeURIComponent(this.props.branch || "HEAD"),
                    file: e.target.value,
                });
            }
        }, 250);
    }
    filterCommits() {
        if (this.state.filter) {
            return this.state.commits.filter((commit) =>
                commit.sha.toLocaleLowerCase().includes(this.state.filter)
                || commit.message.toLocaleLowerCase().includes(this.state.filter)
            );
        }
        return this.state.commits;
    }
    commitItem(commit: LoadCommitReturn) {
        return (
            <li class="short" key={commit.sha} data-sha={commit.sha} onContextMenu={showCommitMenu}>
                <span className="graph-indicator" style={{backgroundColor: headColors[this.graph[commit.sha].colorId]}}></span>
                {
                    this.graph[commit.sha].commit.length > 0 && <ul class="commit-graph">
                        {this.graph[commit.sha].commit.map(child => <li><StaticLink style={{color: headColors[this.graph[child.sha].colorId]}} href={ (this.props.branch ? `/branch/${this.props.branch}/` : "/commit/") + child.sha}>{child.sha.substring(0,7)}</StaticLink></li>)}
                    </ul>
                }
                <Link activeClassName="selected" href={ (this.props.branch ? `/branch/${this.props.branch}/` : "/commit/") + commit.sha}>
                    {Store.heads[commit.sha] && 
                        Store.heads[commit.sha].map(ref => <span>({ref.normalizedName})</span>)
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
                    <input type="text" onKeyUp={this.filterFile} placeholder="File/path..." />
                </div>
                <ul>
                    {this.state.commits && this.filterCommits().map((commit) => this.commitItem(commit))}
                </ul>
            </div>
        );
    }
}
