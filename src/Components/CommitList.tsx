import { h, Component } from "preact";
import { Link } from "router-tsx";
import { IPCAction, sendAsyncMessage } from "../Data/Renderer";
import { registerHandler } from "../Data/Renderer";

export default class CommitList extends Component<{branch: string}, {commits: any[]}> {
    constructor() {
        super();
        registerHandler(IPCAction.LOAD_COMMITS, this.loadCommits);
    }
    componentWillMount() {
        sendAsyncMessage(IPCAction.LOAD_COMMITS, {
            branch: decodeURIComponent(this.props.branch)
        });
    }
    componentWillReceiveProps(nextProps: any) {
        sendAsyncMessage(IPCAction.LOAD_COMMITS, {
            branch: decodeURIComponent(nextProps.branch)
        });
    }
    loadCommits = (commits: any) => {
        this.setState({
            commits
        });
    }
    render() {
        return (
            <div id="commits-pane" class="pane">
                <h4>Commits</h4>
                <ul>
                    {this.state.commits && this.state.commits.map((commit) => (
                        <li class="short">
                            <Link activeClassName="selected" href={`/branch/${this.props.branch}/commit/${commit.sha}`}>
                                <span class="msg">{commit.message}</span>
                                <span class="date">{commit.date}</span>
                                <span class="sha">{commit.sha}</span>
                                <span class="author">{commit.author.name}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        );
    }
}
