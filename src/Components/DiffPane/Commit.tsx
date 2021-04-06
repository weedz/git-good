import { h } from "preact";
import { ipcSendMessage } from "src/Data/Renderer/IPC";
import { IpcAction, CommitObj, PatchObj, IpcActionReturn } from "src/Data/Actions";

import "./style.css";
import CommitMessage from "./CommitMessage";
import ChangedFiles from "./ChangedFiles";
import { StoreComponent } from "src/Data/Renderer/store";

type State = {
    commit: null | CommitObj
    patches: PatchObj[]
    loadingComplete: boolean
}
type Props = {
    sha: string
};

export default class Commit extends StoreComponent<Props, State> {
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
            ipcSendMessage(IpcAction.LOAD_COMMIT, props.sha);
        }
    }
    componentDidMount() {
        this.resetView();
        ipcSendMessage(IpcAction.LOAD_COMMIT, this.props.sha);
        
        this.registerHandler(IpcAction.LOAD_COMMIT, this.loadCommit);
        this.registerHandler(IpcAction.LOAD_PATCHES_WITHOUT_HUNKS, this.handlePatch);
    }
    loadCommit = (commit: IpcActionReturn[IpcAction.LOAD_COMMIT]) => {
        ipcSendMessage(IpcAction.LOAD_PATCHES_WITHOUT_HUNKS, this.props.sha);
        this.setState({
            commit
        });
    }
    handlePatch = (patches: IpcActionReturn[IpcAction.LOAD_PATCHES_WITHOUT_HUNKS]) => {
        this.setState({
            patches,
            loadingComplete: true,
        });
    }
    render() {
        if (!this.state.commit) {
            return <div id="diff-pane" className="pane" />;
        }

        return (
            <div id="diff-pane" className="pane">
                <CommitMessage commit={this.state.commit} />
                <hr />
                <ChangedFiles patches={this.state.patches} commit={this.state.commit} />
            </div>
        );
    }
}
