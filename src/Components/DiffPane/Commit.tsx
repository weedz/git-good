import { h, Component } from "preact";
import { registerHandler, unregisterHandler, sendAsyncMessage } from "src/Data/Renderer/IPC";
import { IpcAction, CommitObj, PatchObj, IpcActionReturn, IpcActionReturnError } from "src/Data/Actions";

import "./style.css";
import CommitMessage from "./CommitMessage";
import ChangedFiles from "./ChangedFiles";

type State = {
    commit: null | CommitObj
    patches: PatchObj[]
    loadingComplete: boolean
}
type Props = {
    sha: string
};

export default class Commit extends Component<Props, State> {
    resetView() {
        this.setState({
            commit: null,
            patches: [],
            loadingComplete: false,
        });
    }
    componentWillReceiveProps(props: Props) {
        if (props.sha !== this.props.sha) {
            this.resetView();
            sendAsyncMessage(IpcAction.LOAD_COMMIT, props.sha);
        }
    }
    componentWillMount() {
        this.resetView();
        sendAsyncMessage(IpcAction.LOAD_COMMIT, this.props.sha);
        
        registerHandler(IpcAction.LOAD_COMMIT, this.loadCommit);
        registerHandler(IpcAction.LOAD_PATCHES_WITHOUT_HUNKS, this.handlePatch);
    }
    componentWillUnmount() {
        unregisterHandler(IpcAction.LOAD_COMMIT, this.loadCommit);
        unregisterHandler(IpcAction.LOAD_PATCHES_WITHOUT_HUNKS, this.handlePatch);
    }
    loadCommit = (commit: IpcActionReturn[IpcAction.LOAD_COMMIT]) => {
        sendAsyncMessage(IpcAction.LOAD_PATCHES_WITHOUT_HUNKS, this.props.sha);
        this.setState({
            commit
        });
    }
    handlePatch = (patches: IpcActionReturn[IpcAction.LOAD_PATCHES_WITHOUT_HUNKS] | IpcActionReturnError) => {
        if ("error" in patches) {
            console.warn(patches.error);
            return;
        }
        this.setState({
            patches,
            loadingComplete: true,
        });
    }
    render() {
        if (!this.state.commit) {
            return;
        }

        return (
            <div id="diff-pane" className="pane">
                <CommitMessage commit={this.state.commit} />
                <hr />

                {!this.state.loadingComplete && <p>Loading...</p>}
                <ChangedFiles patches={this.state.patches} commit={this.state.commit} />
            </div>
        );
    }
}
