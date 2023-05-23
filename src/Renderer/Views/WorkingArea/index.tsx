import { h } from "preact";
import "./style.css";
import { IpcAction, IpcResponse, PatchObj } from "../../../Common/Actions";
import { ipcGetData, ipcSendMessage } from "../../Data/IPC";
import ChangedFiles from "../../Components/DiffPane/ChangedFiles";
import { Store, StoreComponent } from "../../Data/store";
import { triggerAction } from "../../Components/Link";
import { discardAllChanges, discardChanges } from "../../Data";
import CommitForm from "./CommitForm";
import { LinkTypes } from "../../../Common/WindowEventTypes";

function stageFile(e: h.JSX.TargetedEvent<HTMLButtonElement, MouseEvent>) {
    const path = e.currentTarget.dataset.path;
    if (!path) {
        return;
    }
    return ipcGetData(IpcAction.STAGE_FILE, path);
}
function stageAllChanges() {
    return ipcGetData(IpcAction.STAGE_ALL, null);
}
function unstageAllChanges() {
    return ipcGetData(IpcAction.UNSTAGE_ALL, null);
}
function unstageFile (e: h.JSX.TargetedEvent<HTMLButtonElement, MouseEvent>) {
    const path = e.currentTarget.dataset.path;
    if (!path) {
        return;
    }
    return ipcGetData(IpcAction.UNSTAGE_FILE, path);
}
async function discard (e: h.JSX.TargetedEvent<HTMLButtonElement, MouseEvent>) {
    const path = e.currentTarget.dataset.path;
    if (!path) {
        return;
    }

    discardChanges(path);
}

function getChanges() {
    ipcSendMessage(IpcAction.GET_CHANGES, null);
}

type State = {
    unstaged: PatchObj[]
    staged: PatchObj[]
};

export default class WorkingArea extends StoreComponent<unknown, State> {
    state: State = {
        unstaged: [],
        staged: [],
    };
    componentDidMount() {
        this.listen("workDir", getChanges);
        this.registerHandler(IpcAction.GET_CHANGES, this.update);

        getChanges();
    }
    update = (data: IpcResponse<IpcAction.GET_CHANGES>) => {
        if (data instanceof Error) {
            return;
        }
        this.setState({
            staged: data.staged,
            unstaged: data.unstaged,
        }, () => {
            // FIXME: This refreshes an open editor. We could probably handle this somewhere else?
            if (Store.currentFile) {
                triggerAction(LinkTypes.FILES);
            }
        });
    }

    render() {
        return (
            <div id="working-area" class="pane">
                <div id="unstaged-changes">
                    <h4>
                        <span>Unstaged ({this.state.unstaged.length})</span>
                        <button disabled={!this.state.unstaged.length} onClick={stageAllChanges}>Stage all</button>
                        <button disabled={!this.state.unstaged.length} onClick={discardAllChanges}>Discard all</button>
                    </h4>
                    <ChangedFiles patches={this.state.unstaged} workDir type="unstaged" actions={[{label: "Stage", click: stageFile}, {label: "Discard", click: discard}]} />
                </div>
                <div id="staged-changes">
                    <h4>Staged ({this.state.staged.length})<button disabled={!this.state.staged.length} onClick={unstageAllChanges}>Unstage all</button></h4>
                    <ChangedFiles patches={this.state.staged} workDir type="staged" actions={[{label: "Unstage", click: unstageFile}]} />
                </div>
                <div>
                    <CommitForm staged={this.state.staged.length || 0} />
                </div>
            </div>
        );
    }
}
