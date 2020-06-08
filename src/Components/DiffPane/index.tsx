import { h, Component } from "preact";
import { RoutableProps } from "@weedzcokie/router-tsx";
import { registerHandler, unregisterHandler } from "../../Data/Renderer";
import { sendAsyncMessage } from "../../Data/Renderer";
import { IpcAction, CommitObj, PatchObj, IpcActionReturn, IpcActionReturnError } from "../../Data/Actions";

import "./style.css";
import CommitMessage from "./CommitMessage";
import ChangedFiles from "./ChangedFiles";

type Props = {sha: string};
type State = {
    commit: null | CommitObj
    patches: PatchObj[]
    loadingComplete: boolean
    fileFilter: string
}
export default class DiffPane extends Component<RoutableProps<Props>, State> {
    constructor() {
        super();
        this.resetView();
    }
    resetView() {
        this.setState({
            commit: null,
            patches: [],
            loadingComplete: false,
        });
    }
    componentWillMount() {
        registerHandler(IpcAction.LOAD_COMMIT, this.loadCommit);
        registerHandler(IpcAction.LOAD_PATCHES_WITHOUT_HUNKS, this.handlePatch);
        sendAsyncMessage(IpcAction.LOAD_COMMIT, this.props.sha);
    }
    componentWillReceiveProps(newProps: Props) {
        if (this.props.sha !== newProps.sha) {
            sendAsyncMessage(IpcAction.LOAD_COMMIT, newProps.sha);
            this.resetView();
        }
    }
    componentWillUnmount() {
        unregisterHandler(IpcAction.LOAD_COMMIT, this.loadCommit);
        unregisterHandler(IpcAction.LOAD_PATCHES_WITHOUT_HUNKS, this.handlePatch);
    }
    loadCommit = (commit: IpcActionReturn[IpcAction.LOAD_COMMIT]) => {
        sendAsyncMessage(IpcAction.LOAD_PATCHES_WITHOUT_HUNKS, this.props.sha);
        this.setState({
            commit
        });
    }
    handlePatch = (patches: IpcActionReturn[IpcAction.LOAD_PATCHES_WITHOUT_HUNKS] | IpcActionReturnError) => {
        if ("error" in patches) {
            console.warn(patches.error);
            return;
        }
        this.setState({
            patches,
            loadingComplete: true,
        });
    }
    filterFiles = (e: any) => {
        this.setState({
            fileFilter: e.target.value.toLocaleLowerCase()
        });
    }
    render() {
        if (!this.state.commit) {
            return (
                <p>Loading commit...</p>
            );
        }

        const patches = this.state.fileFilter ? this.state.patches.filter(patch => patch.actualFile.path.toLocaleLowerCase().includes(this.state.fileFilter)) : this.state.patches;

        return (
            <div id="diff-pane" class="pane">
                <CommitMessage commit={this.state.commit} />
                <hr />

                <input type="text" onKeyUp={this.filterFiles} placeholder="Search file..." value={this.state.fileFilter} />
                <p>Files: {patches.length}</p>
                {
                    !this.state.loadingComplete
                        ? <p>Loading...</p>
                        : <ChangedFiles patches={patches} commit={this.state.commit} />
                }
            </div>
        );
    }
}
