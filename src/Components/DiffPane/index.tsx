import { h, Component } from "preact";
import { registerHandler, unregisterHandler } from "../../Data/Renderer";
import { sendAsyncMessage } from "../../Data/Renderer";
import { IpcAction, CommitObj, PatchObj, IpcActionReturn, IpcActionReturnError } from "../../Data/Actions";

import "./style.css";
import CommitMessage from "./CommitMessage";
import ChangedFiles from "./ChangedFiles";
import { subscribe, unsubscribe } from "src/Data/Renderer/store";

type State = {
    commit: null | CommitObj
    sha: string
    patches: PatchObj[]
    loadingComplete: boolean
    fileFilter: string
}
export default class DiffPane extends Component<{}, State> {
    constructor() {
        super();
        this.resetView();
    }
    unsubscribe!: Function;
    resetView() {
        this.setState({
            commit: null,
            patches: [],
            loadingComplete: false,
        });
    }
    loadCommitFromStore = (sha: string) => {
        this.resetView();
        this.setState({sha});
        sendAsyncMessage(IpcAction.LOAD_COMMIT, sha);
    }
    componentWillMount() {
        this.unsubscribe = subscribe(this.loadCommitFromStore, "diffPaneSrc");

        registerHandler(IpcAction.LOAD_COMMIT, this.loadCommit);
        registerHandler(IpcAction.LOAD_PATCHES_WITHOUT_HUNKS, this.handlePatch);
    }
    componentWillUnmount() {
        this.unsubscribe();

        unregisterHandler(IpcAction.LOAD_COMMIT, this.loadCommit);
        unregisterHandler(IpcAction.LOAD_PATCHES_WITHOUT_HUNKS, this.handlePatch);
    }
    loadCommit = (commit: IpcActionReturn[IpcAction.LOAD_COMMIT]) => {
        sendAsyncMessage(IpcAction.LOAD_PATCHES_WITHOUT_HUNKS, this.state.sha);
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
            return;
        }

        const patches = this.state.fileFilter ? this.state.patches.filter(patch => patch.actualFile.path.toLocaleLowerCase().includes(this.state.fileFilter)) : this.state.patches;

        return (
            <div id="diff-pane" className="pane">
                <CommitMessage commit={this.state.commit} />
                <hr />

                <input type="text" onKeyUp={this.filterFiles} placeholder="Search file..." value={this.state.fileFilter} />
                <p>Files: {patches.length}</p>
                {!this.state.loadingComplete && <p>Loading...</p>}
                <ChangedFiles patches={patches.slice(0,1000)} commit={this.state.commit} />
            </div>
        );
    }
}
