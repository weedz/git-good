import { h, Component } from "preact";
import { StaticLink, RoutableProps } from "@weedzcokie/router-tsx";
import { registerHandler, unregisterHandler } from "../../Data/Renderer";
import { sendAsyncMessage } from "../../Data/Renderer";
import { IpcAction, CommitObj, PatchObj, IpcActionReturn } from "../../Data/Actions";

import "./style.css";
import { openFile } from "src/Data/Renderer/store";

type Props = {sha: string};
type State = {
    commit: null | CommitObj
    patch: PatchObj[]
    loadingComplete: boolean
    fileFilter: string
}
export default class DiffPane extends Component<RoutableProps<Props>, State> {
    resetView() {
        this.setState({
            commit: null,
            patch: [],
            loadingComplete: false,
        });
    }
    componentWillMount() {
        registerHandler(IpcAction.LOAD_COMMIT, this.loadCommit);
        registerHandler(IpcAction.PATCH_WITHOUT_HUNKS, this.handlePatch);
        sendAsyncMessage(IpcAction.LOAD_COMMIT, this.props.sha);
        this.resetView();
    }
    componentWillReceiveProps(newProps: Props) {
        if (this.props.sha !== newProps.sha) {
            sendAsyncMessage(IpcAction.LOAD_COMMIT, newProps.sha);
            this.resetView();
        }
    }
    componentWillUnmount() {
        unregisterHandler(IpcAction.LOAD_COMMIT, this.loadCommit);
        unregisterHandler(IpcAction.PATCH_WITHOUT_HUNKS, this.handlePatch);
    }
    loadCommit = (commit: CommitObj) => {
        this.setState({
            commit
        });
    }
    handlePatch = (patch: IpcActionReturn[IpcAction.PATCH_WITHOUT_HUNKS]) => {
        if (Array.isArray(patch)) {
            this.setState({
                patch: [...this.state.patch, ...patch]
            });
        } else {
            this.setState({
                loadingComplete: patch.done
            });
        }
    }
    filterFiles = (e: any) => {
        this.setState({
            fileFilter: e.target.value
        });
    }
    render() {
        if (!this.state.commit) {
            return (
                <p>Loading commit...</p>
            );
        }
        const message = this.state.commit.message.split("\n");
        const title = message.shift();
        return (
            <div id="diff-pane" class="pane">
                <h4>{this.state.commit.sha}</h4>
                <p>
                    <span>Parents:</span>
                    <ul class="parent-list">
                        {this.state.commit.parents.map(parent => <li><StaticLink href={`/commit/${parent.sha}`}>{parent.sha.substring(0,7)}</StaticLink></li>)}
                    </ul>
                </p>
                <p class="date">Date: {new Date(this.state.commit.date * 1000).toLocaleString()}</p>
                {this.state.commit.date !== this.state.commit.authorDate && <p class="date">Authored: {new Date(this.state.commit.authorDate * 1000).toLocaleString()}</p>}
                <p class="author">author: {this.state.commit.author.name} &lt;{this.state.commit.author.email}&gt;</p>
                {this.state.commit.commiter.email !== this.state.commit.author.email && <p class="author">commiter: {this.state.commit.commiter.name} &lt;{this.state.commit.commiter.email}&gt;</p>}
                <hr />
                <div class="msg">
                    <h4>{title}</h4>
                    {message.filter(line => !!line).map(line => <p><pre>{line}</pre></p>)}
                </div>
                <hr />
                <p>{!this.state.loadingComplete && <span>Loading...</span>}Files: {this.state.patch.length}</p>
                <input type="text" onKeyUp={this.filterFiles} placeholder="Search file..." value={this.state.fileFilter} />
                <ul class="diff-view" key={this.state.commit.sha}>
                    {this.state.loadingComplete && this.renderPatches(this.state.patch)}
                </ul>
            </div>
        );
    }
    renderPatches = (patches: PatchObj[]) => {
        if (this.state.fileFilter) {
            patches = patches.filter(patch => patch.actualFile.path.includes(this.state.fileFilter));
        }
        return patches.map(this.renderPatch);
    }
    
    renderPatch = (patch: PatchObj) => {
        let typeCss;
        if (patch.type === "M") {
            typeCss = "file-modified";
        } else if (patch.type === "D") {
            typeCss = "file-deleted";
        } else if (patch.type === "A") {
            typeCss = "file-added";
        } else if (patch.type === "R") {
            typeCss = "file-renamed";
        }
        return (
            <li class="sub-tree" key={patch.actualFile.path}>
                <a href="#" onClick={_ => openFile(this.props.sha, patch)}>
                    <span className={typeCss}>{patch.type}</span>&nbsp;
                    <span>{patch.actualFile.path}</span>
                </a>
            </li>
        );
    }
}
