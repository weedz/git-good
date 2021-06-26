import { h } from "preact";
import { ipcSendMessage } from "../../Data/Renderer/IPC";
import { IpcAction, CommitObj, PatchObj, IpcActionReturn } from "../../Data/Actions";

import "./style.css";
import CommitMessage from "./CommitMessage";
import ChangedFiles from "./ChangedFiles";
import { Store, StoreComponent } from "../../Data/Renderer/store";
import { Diff } from "nodegit";
import { triggerAction } from "../Link";

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
        
        this.listen("diffOptions", () => this.state.commit && this.loadCommit(this.state.commit));
        this.registerHandler(IpcAction.LOAD_COMMIT, this.loadCommit);
        this.registerHandler(IpcAction.LOAD_PATCHES_WITHOUT_HUNKS, this.handlePatch);
    }
    loadCommit = (commit: IpcActionReturn[IpcAction.LOAD_COMMIT]) => {
        let options;
        if (Store.diffOptions.ignoreWhitespace) {
            options = {
                flags: Diff.OPTION.IGNORE_WHITESPACE
            };
        }
        ipcSendMessage(IpcAction.LOAD_PATCHES_WITHOUT_HUNKS, {sha: this.props.sha, options});
        this.setState({
            commit
        });
    }
    handlePatch = (patches: IpcActionReturn[IpcAction.LOAD_PATCHES_WITHOUT_HUNKS]) => {
        this.setState({
            patches,
            loadingComplete: true,
        }, () => {
            if (Store.currentFile) {
                triggerAction("files");
            }
        });
    }
    render() {
        if (!this.state.commit) {
            return <div id="diff-pane" className="pane" />;
        }

        return (
            <div id="diff-pane" className="pane">
                <CommitMessage commit={this.state.commit} />
                <ChangedFiles patches={this.state.patches} commit={this.state.commit} />
            </div>
        );
    }
}
