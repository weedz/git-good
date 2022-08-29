import { h } from "preact";
import { ipcSendMessage } from "../../Data/IPC";
import { IpcAction, CommitObj, PatchObj, IpcActionReturn, IpcResponse, Locks } from "../../../Common/Actions";

import "./style.css";
import CommitMessage from "./CommitMessage";
import ChangedFiles from "./ChangedFiles";
import { clearLock, Store, StoreComponent } from "../../Data/store";
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
        
        this.listen("diffOptions", () => this.state.commit && this.loadCommit(this.state.commit));
        this.registerHandler(IpcAction.LOAD_COMMIT, commit => this.loadCommit(commit));
        this.registerHandler(IpcAction.LOAD_PATCHES_WITHOUT_HUNKS, this.handlePatch);
        this.registerHandler(IpcAction.GET_COMMIT_GPG_SIGN, this.handleGpgSign);
    }
    loadCommit = (commit: IpcResponse<IpcAction.LOAD_COMMIT>) => {
        if (!commit || commit instanceof Error) {
            // FIXME: clearLock should not be called here.
            clearLock(Locks.COMMIT_LIST);
            return;
        }

        this.setState({
            commit
        });

        ipcSendMessage(IpcAction.LOAD_PATCHES_WITHOUT_HUNKS, {sha: this.props.sha});
        ipcSendMessage(IpcAction.GET_COMMIT_GPG_SIGN, this.props.sha);
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
    handleGpgSign = (result: IpcActionReturn[IpcAction.GET_COMMIT_GPG_SIGN]) => {
        if (result && result.sha === this.state.commit?.sha) {
            const commit = this.state.commit;
            commit.signature = result.signature;
            this.forceUpdate();
        }
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
