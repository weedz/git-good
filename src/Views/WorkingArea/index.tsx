import { h, Component, Fragment, } from "preact";

import "./style.css";
import { IpcAction, IpcActionReturn, PatchObj } from "src/Data/Actions";
import { registerHandler, unregisterHandler, sendAsyncMessage } from "src/Data/Renderer";
import ChangedFiles from "src/Components/DiffPane/ChangedFiles";

type State = {
    unstaged?: PatchObj[]
    staged?: PatchObj[]
};

export default class WorkingArea extends Component<{}, State> {
    componentWillMount() {
        registerHandler(IpcAction.REFRESH_WORKDIR, this.getChanges);
        registerHandler(IpcAction.GET_CHANGES, this.update);
        registerHandler(IpcAction.STAGE_FILE, this.refresh);
        registerHandler(IpcAction.UNSTAGE_FILE, this.refresh);
        registerHandler(IpcAction.DISCARD_FILE, this.refresh);
        this.getChanges();
    }
    componentWillUnmount() {
        unregisterHandler(IpcAction.REFRESH_WORKDIR, this.getChanges);
        unregisterHandler(IpcAction.GET_CHANGES, this.update);
        unregisterHandler(IpcAction.STAGE_FILE, this.refresh);
        unregisterHandler(IpcAction.UNSTAGE_FILE, this.refresh);
        unregisterHandler(IpcAction.DISCARD_FILE, this.refresh);
    }
    getChanges = () => {
        sendAsyncMessage(IpcAction.GET_CHANGES);
    }
    update = (data: IpcActionReturn[IpcAction.GET_CHANGES]) => {
        this.setState({
            staged: data.staged,
            unstaged: data.unstaged,
        });
    }
    refresh = () => {
        sendAsyncMessage(IpcAction.REFRESH_WORKDIR);
    }
    stageFile = (e: any) => {
        const path = e.currentTarget.dataset.path;
        sendAsyncMessage(IpcAction.STAGE_FILE, path);
    }
    unstageFile = (e: any) => {
        const path = e.currentTarget.dataset.path;
        sendAsyncMessage(IpcAction.UNSTAGE_FILE, path);
    }
    discard = (e: any) => {
        const path = e.currentTarget.dataset.path;
        sendAsyncMessage(IpcAction.DISCARD_FILE, path);
    }
    render() {
        return (
            <div id="working-area">
                <div id="commit-stage">
                    <div id="unstaged-changes" className="pane">
                        <h4>Unstaged ({this.state.unstaged?.length})<button>Stage all</button></h4>
                        {this.state.unstaged && <ChangedFiles patches={this.state.unstaged} workDir actions={[{label: "Stage", click: this.stageFile}, {label: "Discard", click: this.discard}]} />}
                    </div>
                    <div id="staged-changes" className="pane">
                        <h4>Staged ({this.state.staged?.length})<button>Unstage all</button></h4>
                        {this.state.staged && <ChangedFiles patches={this.state.staged} workDir actions={[{label: "Unstage", click: this.unstageFile}]} />}
                    </div>
                    <div className="pane">
                        <h4>Commit</h4>
                        <form>
                            <input type="text" name="summary" placeholder="Summary" />
                            <br />
                            <textarea name="msg"></textarea>
                            <br />
                            <input type="submit" name="commit" value="Commit" />
                            <label>
                                <input type="checkbox" name="amend" />
                                <span>Amend</span>
                            </label>
                        </form>
                    </div>
                </div>
            </div>
        );
    }
}
