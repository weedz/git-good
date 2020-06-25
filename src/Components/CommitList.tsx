import { h, Component } from "preact";
import { Link } from "@weedzcokie/router-tsx";
import { sendAsyncMessage, unregisterHandler, registerHandler } from "../Data/Renderer";
import { IpcAction, IpcActionReturn, IpcActionReturnError } from "../Data/Actions";
import { Store } from "../Data/Renderer/store";

type Props = {
    branch?: string
    sha?: string
    history?: boolean
};
type State = {
    commits: IpcActionReturn[IpcAction.LOAD_COMMITS]
    filter: string
};

const headColors = [
    "lightblue",
    "red",
    "lightgreen",
    "teal",
    "yellow"
];

export default class CommitList extends Component<Props, State> {
    componentWillMount() {
        registerHandler(IpcAction.LOAD_COMMITS, this.loadCommits);
        this.handleProps(this.props, true);
    }
    componentWillUnmount() {
        unregisterHandler(IpcAction.LOAD_COMMITS, this.loadCommits);
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
                    branch: decodeURIComponent(props.branch || "HEAD")
                });
            }
        } else {
            // sendAsyncMessage(IPCAction.LOAD_COMMITS, {
            //     sha: decodeURIComponent(props.sha)
            // });
        }
    }
    loadCommits = (commits: IpcActionReturn[IpcAction.LOAD_COMMITS] | IpcActionReturnError) => {
        console.log("loaded commits");
        if ("error" in commits) {
            console.warn(commits);
            return;
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
    filterCommits() {
        if (this.state.filter) {
            return this.state.commits.filter((commit) =>
                commit.sha.toLocaleLowerCase().includes(this.state.filter)
                || commit.message.toLocaleLowerCase().includes(this.state.filter)
            );
        }
        return this.state.commits;
    }
    render() {
        return (
            <div id="commits-pane" class="pane">
                <h4>Commits</h4>
                <div>
                    <input type="text" value={this.state.filter} onKeyUp={this.filter} placeholder="sha,message" />
                </div>
                <ul className="block-list">
                    {this.state.commits && this.filterCommits().map((commit, index) => (
                        <li class="short" key={commit.sha}>
                            <Link activeClassName="selected" href={ (this.props.branch ? `/branch/${this.props.branch}/` : "/commit/") + commit.sha}>
                                {Store.heads[commit.sha] && 
                                    Store.heads[commit.sha].map(ref => <span style={{color: headColors[index % headColors.length]}}>({ref.normalizedName})</span>)
                                }
                                <span class="msg">{commit.message.substring(0, commit.message.indexOf("\n")>>>0 || 60)}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        );
    }
}
