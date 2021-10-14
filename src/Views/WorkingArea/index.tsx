import { h } from "preact";
import "./style.css";
import { IpcAction, IpcActionReturn, PatchObj } from "../../Data/Actions";
import { ipcGetData, ipcSendMessage } from "../../Data/Renderer/IPC";
import ChangedFiles from "../../Components/DiffPane/ChangedFiles";
import { Store, StoreComponent } from "../../Data/Renderer/store";
import { triggerAction } from "../../Components/Link";
import { discardChanges, refreshWorkdir } from "../../Data/Renderer";
import CommitForm from "./CommitForm";

type State = {
    unstaged?: PatchObj[]
    staged?: PatchObj[]
};

export default class WorkingArea extends StoreComponent<unknown, State> {
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
                    <h4>Unstaged ({this.state.unstaged?.length})</h4>
                    {this.state.unstaged && <ChangedFiles key={`workdir-${this.state.unstaged.length}`} patches={this.state.unstaged} workDir type="unstaged" actions={[{label: "Stage", click: this.stageFile}, {label: "Discard", click: this.discard}]} />}
                </div>
                <div id="staged-changes">
                    <h4>Staged ({this.state.staged?.length})</h4>
                    {this.state.staged && <ChangedFiles key={`workdir-${this.state.staged.length}`} patches={this.state.staged} workDir type="staged" actions={[{label: "Unstage", click: this.unstageFile}]} />}
                </div>
                <div>
                    <CommitForm staged={this.state.staged?.length || 0} />
                </div>
            </div>
        );
    }
}
