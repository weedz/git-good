import { h, Component } from "preact";
import { Link } from "@weedzcokie/router-tsx";
import { IpcActionReturn, IpcAction } from "src/Data/Actions";
import { Store } from "src/Data/Renderer/store";
import { registerHandler, unregisterHandler, sendAsyncMessage } from "src/Data/Renderer";

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

export default class History extends Component<{}, State> {
    componentWillMount() {
        registerHandler(IpcAction.LOAD_COMMIT_HISTORY, this.loadCommits);
        sendAsyncMessage(IpcAction.LOAD_COMMIT_HISTORY, {
            num: 1000
        });
    }
    componentWillUnmount() {
        unregisterHandler(IpcAction.LOAD_COMMIT_HISTORY, this.loadCommits);
    }
    loadCommits = (commits: IpcActionReturn[IpcAction.LOAD_COMMIT_HISTORY]) => {
        this.setState({
            commits
        });
    }
    render() {
        return (
            <div id="commits-pane" class="pane">
                <h4>History</h4>
                <ul>
                    {this.state.commits && this.state.commits.map((commit, index) => (
                        <li class="short" key={commit.sha}>
                            <Link activeClassName="selected" href={ "/history/commit/" + commit.sha}>
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
