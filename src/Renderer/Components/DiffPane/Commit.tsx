import { h } from "preact";
import { ipcGetData, ipcSendMessage } from "../../Data/IPC";
import { IpcAction, CommitObj, PatchObj, IpcActionReturn, IpcResponse, Locks, FileObj } from "../../../Common/Actions";

import "./style.css";
import CommitMessage from "./CommitMessage";
import ChangedFiles from "./ChangedFiles";
import { clearLock, Store, StoreComponent } from "../../Data/store";
import { triggerAction } from "../Link";
import { DiffDelta } from "../../../Common/Utils";

interface State {
    commit: null | CommitObj
    patches: PatchObj[]
    tree: null | PatchObj[]
}
interface Props {
    sha: string
}

function mapTreeToPatchObj(tree: string[]) {
    return tree.map(item => {
        const fileObj = {
            path: item,
            flags: 0,
            mode: 0,
            size: 0
        } as FileObj;
        return {
            actualFile: fileObj,
            lineStats: {
                total_additions: 0,
                total_context: 0,
                total_deletions: 0,
            },
            status: DiffDelta.UNMODIFIED,
            newFile: fileObj,
            oldFile: fileObj
        }
    })
}

export default class Commit extends StoreComponent<Props, State> {
    resetView() {
        this.setState({
            commit: null,
            patches: [],
            tree: null
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
                <div>
                    <label>
                        <span>View all files</span>
                        <input type="checkbox" onInput={async e => {
                            if (e.currentTarget.checked && this.state.commit?.sha) {
                                const tree = await ipcGetData(IpcAction.LOAD_TREE_AT_COMMIT, this.state.commit.sha);
                                this.setState({
                                    tree: mapTreeToPatchObj(tree)
                                });
                            } else {
                                this.setState({
                                    tree: null
                                });
                            }
                        }} />
                    </label>
                </div>
                <ChangedFiles patches={this.state.tree || this.state.patches} commit={this.state.commit} />
            </div>
        );
    }
}
