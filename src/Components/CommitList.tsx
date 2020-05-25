import { h, Component } from "preact";
import { Link } from "@weedzcokie/router-tsx";
import { sendAsyncMessage, unregisterHandler } from "../Data/Renderer";
import { registerHandler } from "../Data/Renderer";
import { IPCAction, IPCActionReturn } from "../Data/Actions";
import { Store } from "../Data/Renderer/store";

type Props = {
    branch?: string
    sha?: string
};

const headColors = [
    "lightblue",
    "red",
    "lightgreen",
    "teal",
    "yellow"
];

export default class CommitList extends Component<Props, {commits: IPCActionReturn[IPCAction.LOAD_COMMITS]}> {
    componentWillMount() {
        registerHandler(IPCAction.LOAD_COMMITS, this.loadCommits);
        this.handleProps(this.props);
    }
    componentWillUnmount() {
        unregisterHandler(IPCAction.LOAD_COMMITS, this.loadCommits);
    }
    componentWillReceiveProps(nextProps: Props) {
        this.handleProps(nextProps);
    }
    handleProps(props: Props) {
        if (!props.sha) {
            sendAsyncMessage(IPCAction.LOAD_COMMITS, {
                branch: decodeURIComponent(props.branch || "HEAD")
            });
        } else {
            // sendAsyncMessage(IPCAction.LOAD_COMMITS, {
            //     sha: decodeURIComponent(props.sha)
            // });
        }
    }
    loadCommits = (commits: IPCActionReturn[IPCAction.LOAD_COMMITS]) => {
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
                                {/* <span class="date">{commit.date}</span> */}
                                {/* <span class="sha">{commit.sha}</span> */}
                                {/* <span class="author">{commit.author.name}</span> */}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        );
    }
}
