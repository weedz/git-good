import { h, Component } from "preact";
import { Link } from "@weedzcokie/router-tsx";
import { sendAsyncMessage, unregisterHandler } from "../Data/Renderer";
import { registerHandler } from "../Data/Renderer";
import { LoadCommitsReturn } from "../index";
import { IPCAction } from "../Data/Actions";

type Props = {
    branch?: string
    sha?: string
};

export default class CommitList extends Component<Props, {commits: LoadCommitsReturn}> {
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
    loadCommits = (commits: LoadCommitsReturn) => {
        this.setState({
            commits
        });
    }
    render() {
        return (
            <div id="commits-pane" class="pane">
                <h4>Commits</h4>
                <ul>
                    {this.state.commits && this.state.commits.map(commit => (
                        <li class="short" key={commit.sha}>
                            <Link activeClassName="selected" href={ (this.props.branch ? `/branch/${this.props.branch}/` : "/commit/") + commit.sha}>
                                <span class="msg">{commit.message.substring(0, commit.message.indexOf("\n")>>>0)}</span>
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
