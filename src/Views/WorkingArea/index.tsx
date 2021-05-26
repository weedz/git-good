import { h } from "preact";

import "./style.css";
import { IpcAction, IpcActionReturn, PatchObj } from "src/Data/Actions";
import { ipcGetData, ipcSendMessage } from "src/Data/Renderer/IPC";
import ChangedFiles from "src/Components/DiffPane/ChangedFiles";
import { commit, updateStore, Store, StoreType, StoreComponent } from "src/Data/Renderer/store";
import { triggerAction } from "src/Components/Link";
import { Diff } from "nodegit";
import { discardChanges, refreshWorkdir } from "src/Data/Renderer";

type State = {
    unstaged?: PatchObj[]
    staged?: PatchObj[]
    amend?: boolean
    commitMsg: StoreType["commitMsg"]
};

export default class WorkingArea extends StoreComponent<unknown, State> {
    constructor() {
        super();

        this.state = {
            commitMsg: Store.commitMsg,
        }
    }
    componentDidMount() {
        this.registerHandler(IpcAction.REFRESH_WORKDIR, this.getChanges);
        this.registerHandler(IpcAction.GET_CHANGES, this.update);

        this.listen("diffOptions", (diffOptions) => {
            let options = null;
            if (diffOptions.ignoreWhitespace) {
                options = {
                    flags: Diff.OPTION.IGNORE_WHITESPACE
                };
            }
            ipcSendMessage(IpcAction.REFRESH_WORKDIR, options);
        });
        this.listen("commitMsg", msg => {
            this.setState({commitMsg: msg});
        });
        this.getChanges();
    }
    getChanges = () => {
        ipcSendMessage(IpcAction.GET_CHANGES, null);
    }
    update = (data: IpcActionReturn[IpcAction.GET_CHANGES]) => {
        this.setState({
            staged: data.staged,
            unstaged: data.unstaged,
        }, () => {
            if (Store.currentFile) {
                triggerAction("files");
            }
        });
    }
    stageFile = async (e: h.JSX.TargetedEvent<HTMLButtonElement, MouseEvent>) => {
        const path = e.currentTarget.dataset.path;
        if (!path) {
            return;
        }
        await ipcGetData(IpcAction.STAGE_FILE, path);
        refreshWorkdir();
    }
    unstageFile = async (e: h.JSX.TargetedEvent<HTMLButtonElement, MouseEvent>) => {
        const path = e.currentTarget.dataset.path;
        if (!path) {
            return;
        }
        await ipcGetData(IpcAction.UNSTAGE_FILE, path);
        refreshWorkdir();
    }
    discard = async (e: h.JSX.TargetedEvent<HTMLButtonElement, MouseEvent>) => {
        const path = e.currentTarget.dataset.path;
        if (!path) {
            return;
        }

        discardChanges(path);
    }
    setAmend = (e: h.JSX.TargetedEvent<HTMLInputElement, MouseEvent>) => {
        const target = e.currentTarget;
        if (target.checked !== this.state.amend) {
            const amend = target.checked;
            const newState: Partial<State> = {
                amend,
            };
            if (!amend) {
                newState.commitMsg = Store.commitMsg;
            } else {
                newState.commitMsg = Store.head?.commit.message
            }
            this.setState(newState);
        }
    }
    commit = (e: h.JSX.TargetedEvent<HTMLInputElement, MouseEvent>) => {
        e.preventDefault();
        updateStore({
            commitMsg: {
                body: "",
                summary: ""
            }
        });
        this.setState({
            amend: false
        });
        commit({
            message: this.state.commitMsg,
            amend: this.state.amend,
        });
    }
    updateMessage(msg: {summary: string} | {body: string}) {
        const commitMsg = this.state.amend ? this.state.commitMsg : Store.commitMsg;
        Object.assign(commitMsg, msg);
        if (this.state.amend) {
            this.setState({commitMsg});
        } else {
            updateStore({commitMsg});
        }
    }
    render() {
        let commitButton;
        if (this.state.amend) {
            commitButton = <input type="submit" name="amend" value="Amend" onClick={this.commit} disabled={!this.state.commitMsg.summary.length} />
        } else if (Store.repo?.status?.rebasing) {
            commitButton = <input type="submit" name="amend" value="Continue rebase" onClick={(e) => {
                e.preventDefault();
                console.log("continue rebase");
            }} />
        } else {
            commitButton = <input type="submit" name="commit" value="Commit" onClick={this.commit} disabled={!this.state.staged?.length || !this.state.commitMsg.summary.length} />
        }

        return (
            <div id="working-area" className="pane">
                <div id="unstaged-changes">
                    <h4>Unstaged ({this.state.unstaged?.length})</h4>
                    {this.state.unstaged && <ChangedFiles patches={this.state.unstaged} workDir type="unstaged" actions={[{label: "Stage", click: this.stageFile}, {label: "Discard", click: this.discard}]} />}
                </div>
                <div id="staged-changes">
                    <h4>Staged ({this.state.staged?.length})</h4>
                    {this.state.staged && <ChangedFiles patches={this.state.staged} workDir type="staged" actions={[{label: "Unstage", click: this.unstageFile}]} />}
                </div>
                <div>
                    <h4>Commit</h4>
                    <form>
                        <input type="text" style={{width: "100%"}} name="summary" placeholder="Summary" value={this.state.commitMsg.summary} onKeyUp={(e: h.JSX.TargetedEvent<HTMLInputElement, KeyboardEvent>) => {
                            this.updateMessage({summary: e.currentTarget.value});
                        }} />
                        <br />
                        <textarea id="commit-msg" name="msg" placeholder="Description" onKeyUp={(e: h.JSX.TargetedEvent<HTMLTextAreaElement, KeyboardEvent>) => {
                            this.updateMessage({body: e.currentTarget.value});
                        }} value={this.state.commitMsg.body} />
                        <br />
                        {commitButton}
                        <label>
                            <input type="checkbox" name="amend" onClick={this.setAmend} checked={this.state.amend} />
                            <span>Amend</span>
                        </label>
                    </form>
                </div>
            </div>
        );
    }
}
