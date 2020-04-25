import { h, Component } from "preact";
import { StaticLink } from "router-tsx";
import { IPCAction, registerHandler, unregisterHandler } from "../Data/Renderer";
import { sendAsyncMessage } from "../Data/Renderer";
import { getBranchTree } from "../Data/Branch";

type Props = {commit: string};
export default class DiffPane extends Component<Props, {commit: any}> {
    componentWillMount() {
        registerHandler(IPCAction.LOAD_COMMIT, this.loadCommit);
        sendAsyncMessage(IPCAction.LOAD_COMMIT, this.props.commit);
    }
    componentWillReceiveProps(newProps: Props) {
        sendAsyncMessage(IPCAction.LOAD_COMMIT, newProps.commit);
    }
    componentWillUnmount() {
        unregisterHandler(IPCAction.LOAD_COMMIT, this.loadCommit);
    }
    loadCommit = (commit: any) => {
        this.setState({
            commit
        });
    }
    render() {
        if (!this.state.commit) {
            return (
                <p>Loading commit...</p>
            );
        }
        return (
            <div id="diff-pane" class="pane">
                <h4>Commit {this.state.commit.sha}</h4>
                <p>Parent: <StaticLink href={`/commit/${this.state.commit.parent.sha}`}>{this.state.commit.parent.sha.substring(0,7)}</StaticLink></p>
                <p class="date">authored: {this.state.commit.date}</p>
                <p class="author">author: {this.state.commit.author.name} &lt;{this.state.commit.author.email}&gt;</p>
                <p class="msg">{this.state.commit.message}</p>
                <hr />
                <p>Diff:</p>
            </div>
        );
    }
}
