import { h } from "preact";
import "./style.css";
import { IpcAction, IpcActionReturn, PatchObj } from "../../../Common/Actions";
import { ipcGetData, ipcSendMessage } from "../../Data/IPC";
import ChangedFiles from "../../Components/DiffPane/ChangedFiles";
import { Store, StoreComponent } from "../../Data/store";
import { triggerAction } from "../../Components/Link";
import { discardChanges, refreshWorkdir } from "../../Data";
import CommitForm from "./CommitForm";

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
        this.registerHandler(IpcAction.REFRESH_WORKDIR, this.getChanges);
        this.registerHandler(IpcAction.GET_CHANGES, this.update);

        this.listen("diffOptions", (_diffOptions) => {
            setTimeout(() => refreshWorkdir());
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
            // FIXME: This refreshes an open editor. We could probably handle this somewhere else?
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

    render() {
        return (
            <div id="working-area" className="pane">
                <div id="unstaged-changes">
                    <h4>Unstaged ({this.state.unstaged.length})<button disabled={!this.state.unstaged.length} onClick={async () => {
                        await ipcGetData(IpcAction.STAGE_ALL, null);
                        refreshWorkdir();
                    }}>Stage all</button></h4>
                    {this.state.unstaged && <ChangedFiles patches={this.state.unstaged} workDir type="unstaged" actions={[{label: "Stage", click: this.stageFile}, {label: "Discard", click: this.discard}]} />}
                </div>
                <div id="staged-changes">
                    <h4>Staged ({this.state.staged.length})<button disabled={!this.state.staged.length} onClick={async () => {
                        await ipcGetData(IpcAction.UNSTAGE_ALL, null);
                        refreshWorkdir();
                    }}>Unstage all</button></h4>
                    {this.state.staged && <ChangedFiles patches={this.state.staged} workDir type="staged" actions={[{label: "Unstage", click: this.unstageFile}]} />}
                </div>
                <div>
                    <CommitForm staged={this.state.staged.length || 0} />
                </div>
            </div>
        );
    }
}
