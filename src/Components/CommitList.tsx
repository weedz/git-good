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
        this.handleProps(this.props);
    }
    componentWillUnmount() {
        unregisterHandler(IpcAction.LOAD_COMMITS, this.loadCommits);
    }
    componentWillReceiveProps(nextProps: Props) {
        this.handleProps(nextProps);
    }
    handleProps(props: Props) {
        if (props.history) {
            sendAsyncMessage(IpcAction.LOAD_COMMITS, {
                num: 1000,
                history: true
            });
        } else if (!props.sha) {
            sendAsyncMessage(IpcAction.LOAD_COMMITS, {
                branch: decodeURIComponent(props.branch || "HEAD")
            });
        } else {
            // sendAsyncMessage(IPCAction.LOAD_COMMITS, {
            //     sha: decodeURIComponent(props.sha)
            // });
        }
    }
    loadCommits = (commits: IpcActionReturn[IpcAction.LOAD_COMMITS] | IpcActionReturnError) => {
        if ("error" in commits) {
            console.warn(commits);
            return;
        }
        this.setState({
            commits
        });
    }
    render() {
        return (
            <div id="commits-pane" class="pane">
                <h4>Commits</h4>
                <ul>
                    {this.state.commits && this.state.commits.map((commit, index) => (
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
