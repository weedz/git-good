import { h } from "preact";
import { ipcSendMessage } from "../../Data/Renderer/IPC";
import { IpcAction, CommitObj, PatchObj, IpcActionReturn, IpcResponse, Locks } from "../../Data/Actions";

import "./style.css";
import CommitMessage from "./CommitMessage";
import ChangedFiles from "./ChangedFiles";
import { clearLock, Store, StoreComponent } from "../../Data/Renderer/store";
import { Diff } from "nodegit";
import { triggerAction } from "../Link";

interface State {
    commit: null | CommitObj
    patches: PatchObj[]
}
interface Props {
    sha: string
}

export default class Commit extends StoreComponent<Props, State> {
    resetView() {
        this.setState({
            commit: null,
            patches: [],
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
        
        this.listen("diffOptions", diffOptions => this.state.commit && this.loadCommit(this.state.commit, diffOptions));
        this.registerHandler(IpcAction.LOAD_COMMIT, commit => this.loadCommit(commit, Store.diffOptions));
        this.registerHandler(IpcAction.LOAD_PATCHES_WITHOUT_HUNKS, this.handlePatch);
    }
    loadCommit = (commit: IpcResponse<IpcAction.LOAD_COMMIT>, diffOptions: typeof Store["diffOptions"]) => {
        if (!commit) {
            // FIXME: clearLock should not be called here.
            clearLock(Locks.COMMIT_LIST);
            return;
        }
        let options;
        if (diffOptions.ignoreWhitespace) {
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
