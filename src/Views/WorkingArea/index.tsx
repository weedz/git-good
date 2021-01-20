import { h, Component } from "preact";

import "./style.css";
import { CommitObj, IpcAction, IpcActionReturn, PatchObj } from "src/Data/Actions";
import { registerHandler, unregisterHandler, sendAsyncMessage } from "src/Data/Renderer/IPC";
import ChangedFiles from "src/Components/DiffPane/ChangedFiles";
import { remote } from "electron";
import { commit, updateStore, Store, StoreType, subscribe, unsubscribe } from "src/Data/Renderer/store";
import { triggerAction } from "src/Components/Link";

type State = {
    unstaged?: PatchObj[]
    staged?: PatchObj[]
    amend?: boolean
    head?: CommitObj
    commitMsg: StoreType["commitMsg"]
};

export default class WorkingArea extends Component<unknown, State> {
    constructor() {
        super();

        this.state = {
            commitMsg: Store.commitMsg,
        }
    }
    componentDidMount() {
        registerHandler(IpcAction.REFRESH_WORKDIR, this.getChanges);
        registerHandler(IpcAction.GET_CHANGES, this.update);
        registerHandler(IpcAction.LOAD_COMMIT, this.setHead);

        sendAsyncMessage(IpcAction.LOAD_COMMIT);

        subscribe(this.setCommitMsg, "commitMsg");
        this.getChanges();
    }
    componentWillUnmount() {
        unregisterHandler(IpcAction.REFRESH_WORKDIR, this.getChanges);
        unregisterHandler(IpcAction.GET_CHANGES, this.update);
        unregisterHandler(IpcAction.LOAD_COMMIT, this.setHead);

        unsubscribe(this.setCommitMsg, "commitMsg");
    }
    setCommitMsg = (msg: StoreType["commitMsg"]) => {
        this.setState({commitMsg: msg});
    }
    setHead = (head: CommitObj) => {
        this.setState({
            head
        });
    }
    getChanges = () => {
        sendAsyncMessage(IpcAction.GET_CHANGES);
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
    stageFile = (e: h.JSX.TargetedEvent<HTMLButtonElement, MouseEvent>) => {
        const path = e.currentTarget.dataset.path;
        sendAsyncMessage(IpcAction.STAGE_FILE, path);
    }
    unstageFile = (e: h.JSX.TargetedEvent<HTMLButtonElement, MouseEvent>) => {
        const path = e.currentTarget.dataset.path;
        sendAsyncMessage(IpcAction.UNSTAGE_FILE, path);
    }
    discard = async (e: h.JSX.TargetedEvent<HTMLButtonElement, MouseEvent>) => {
        const path = e.currentTarget.dataset.path;

        const result = await remote.dialog.showMessageBox({
            message: `Discard changes to "${path}"?`,
            type: "question",
            buttons: ["Confirm", "Cancel"],
            cancelId: 1,
        });
        if (result.response === 0) {
            sendAsyncMessage(IpcAction.DISCARD_FILE, path);
        }
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
                newState.commitMsg = this.state.head?.message
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
            commitButton = <input type="submit" name="amend" value="Amend" onClick={this.commit} />
        } else {
            commitButton = <input type="submit" name="commit" value="Commit" onClick={this.commit} disabled={!this.state.staged?.length} />
        }

        return (
            <div id="working-area" className="pane">
                <div id="unstaged-changes">
                    <h4>Unstaged ({this.state.unstaged?.length})<button>Stage all</button></h4>
                    {this.state.unstaged && <ChangedFiles patches={this.state.unstaged} workDir actions={[{label: "Stage", click: this.stageFile}, {label: "Discard", click: this.discard}]} />}
                </div>
                <div id="staged-changes">
                    <h4>Staged ({this.state.staged?.length})<button>Unstage all</button></h4>
                    {this.state.staged && <ChangedFiles patches={this.state.staged} workDir actions={[{label: "Unstage", click: this.unstageFile}]} />}
                </div>
                <div>
                    <h4>Commit</h4>
                    <form>
                        <input type="text" style={{width: "100%"}} name="summary" placeholder="Summary" value={this.state.commitMsg.summary} onKeyUp={(e: h.JSX.TargetedEvent<HTMLInputElement, KeyboardEvent>) => {
                            this.updateMessage({summary: e.currentTarget.value});
                        }} />
                        <br />
                        <textarea id="commit-msg" name="msg" onKeyUp={(e: h.JSX.TargetedEvent<HTMLTextAreaElement, KeyboardEvent>) => {
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
