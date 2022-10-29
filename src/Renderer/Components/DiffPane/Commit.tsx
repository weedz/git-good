import { h } from "preact";
import { ipcGetData } from "../../Data/IPC";
import { IpcAction, CommitObj, PatchObj, IpcActionReturn, Locks, FileObj } from "../../../Common/Actions";

import "./style.css";
import CommitMessage from "./CommitMessage";
import ChangedFiles from "./ChangedFiles";
import { clearLock, Store, StoreComponent } from "../../Data/store";
import { triggerAction } from "../Link";
import { DiffDelta } from "../../../Common/Utils";
import { LinkTypes } from "../../../Common/WindowEventTypes";

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
            this.getCommit(props.sha);
        } else {
            clearLock(Locks.COMMIT_LIST);
        }
    }
    componentDidMount() {
        this.resetView();
        this.getCommit(this.props.sha);

        this.listen("diffOptions", () => this.state.commit && this.loadPatches());
    }
    loadPatches() {
        ipcGetData(IpcAction.LOAD_PATCHES_WITHOUT_HUNKS, {sha: this.props.sha}).then(this.handlePatch);
    }
    async getCommit(sha: string) {
        const commit = await ipcGetData(IpcAction.LOAD_COMMIT, sha);

        if (!commit || commit instanceof Error) {
            // FIXME: clearLock should not be called here.
            clearLock(Locks.COMMIT_LIST);
            return;
        }

        this.setState({ commit });

        ipcGetData(IpcAction.GET_COMMIT_GPG_SIGN, this.props.sha).then(this.handleGpgSign);
        this.loadPatches();
    }
    handlePatch = (patches: IpcActionReturn[IpcAction.LOAD_PATCHES_WITHOUT_HUNKS]) => {
        this.setState({
            patches,
        }, () => {
            if (Store.currentFile) {
                triggerAction(LinkTypes.FILES);
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
            return <div id="diff-pane" class="pane" />;
        }

        return (
            <div id="diff-pane" class="pane">
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
