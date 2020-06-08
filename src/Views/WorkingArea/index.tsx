import { h, Component, } from "preact";
import { RoutableProps } from "@weedzcokie/router-tsx";
import FileDiff from "../../Components/FileDiff";

import "./style.css";
import { IpcAction, IpcActionReturn, PatchObj } from "src/Data/Actions";
import { registerHandler, unregisterHandler, sendAsyncMessage } from "src/Data/Renderer";
import ChangedFiles from "src/Components/DiffPane/ChangedFiles";

/*

Stage/unstage: Repository#stageFilemode

*/

type State = {
    unstaged?: PatchObj[]
    staged?: PatchObj[]
};

export default class WorkingArea extends Component<RoutableProps, State> {
    componentWillMount() {
        registerHandler(IpcAction.GET_CHANGES, this.update);
        sendAsyncMessage(IpcAction.GET_CHANGES);
    }
    componentWillUnmount() {
        unregisterHandler(IpcAction.GET_CHANGES, this.update);
    }
    update = (data: IpcActionReturn[IpcAction.GET_CHANGES]) => {
        this.setState({
            staged: data.staged,
            unstaged: data.unstaged,
        });
    }
    render() {
        return (
            <div id="working-area">
                <FileDiff />
                <div id="commit-stage">
                    <div id="unstaged-changes" class="pane">
                        <h4>Unstaged ({this.state.unstaged?.length})</h4>
                        {this.state.unstaged && <ChangedFiles patches={this.state.unstaged} workDir />}
                    </div>
                    <div id="staged-changes" class="pane">
                        <h4>Staged ({this.state.staged?.length})</h4>
                        {this.state.staged && <ChangedFiles patches={this.state.staged} workDir />}
                    </div>
                    <div class="pane">
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
