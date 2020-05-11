import { h, Component } from "preact";
import { StaticLink, RoutableProps } from "@weedzcokie/router-tsx";
import { registerHandler, unregisterHandler } from "../../Data/Renderer";
import { sendAsyncMessage } from "../../Data/Renderer";
import { IPCAction, CommitObj, DiffObj, PatchObj, HunkObj, LineObj, IPCActionReturn } from "../../Data/Actions";

import "./style.css";

function toggleTreeItem(e: any) {
    e.preventDefault();
    const parent = e.target.closest("li");
    if (parent.classList.contains("open")) {
        parent.classList.remove("open");
    } else {
        parent.classList.add("open");
    }
    return false;
}

type Props = {commit?: string};
type State = {
    commit: null | CommitObj
    patch: PatchObj[]
    loadingComplete: boolean
    fileFilter: string
}
export default class DiffPane extends Component<RoutableProps<Props>, State> {
    patchesToLoad: any = {};    // FIXME
    loadedPatches: any = {};    // FIXME
    patchMap: any = {};    // FIXME
    resetView() {
        this.patchesToLoad = {};
        this.loadedPatches = {};
        this.setState({
            commit: null,
            patch: [],
            loadingComplete: false,
        });
    }
    componentWillMount() {
        registerHandler(IPCAction.LOAD_COMMIT, this.loadCommit);
        registerHandler(IPCAction.PATCH_WITHOUT_HUNKS, this.handlePatch);
        registerHandler(IPCAction.LOAD_HUNKS, this.loadHunks);
        sendAsyncMessage(IPCAction.LOAD_COMMIT, this.props.commit);
        this.resetView();
    }
    componentWillReceiveProps(newProps: Props) {
        sendAsyncMessage(IPCAction.LOAD_COMMIT, newProps.commit);
        this.resetView();
    }
    componentWillUnmount() {
        unregisterHandler(IPCAction.LOAD_COMMIT, this.loadCommit);
        unregisterHandler(IPCAction.PATCH_WITHOUT_HUNKS, this.handlePatch);
        unregisterHandler(IPCAction.LOAD_HUNKS, this.loadHunks);
    }
    loadCommit = (commit: CommitObj) => {
        this.setState({
            commit
        });
    }
    loadHunks = (data: IPCActionReturn[IPCAction.LOAD_HUNKS]) => {
        const patch = this.patchesToLoad[data.path];
        if (patch) {
            patch.hunks = data.hunks;
            delete this.patchesToLoad[data.path];
            this.loadedPatches[data.path] = patch;
            this.setState({});
        }
    }
    handlePatch = (patch: IPCActionReturn[IPCAction.PATCH_WITHOUT_HUNKS]) => {
        if (Array.isArray(patch)) {
            this.setState({
                patch: [...this.state.patch, ...patch]
            });
        } else {
            for (const patch of this.state.patch) {
                this.patchMap[patch.actualFile.path] = patch;
            }
            this.setState({
                loadingComplete: patch.done
            });
        }
    }
    toggleFile = (e: any, path: string) => {
        if (!this.state.commit) {
            return;
        }
        toggleTreeItem(e);
        if (!this.loadedPatches[path]) {
            const patch = this.patchMap[path];
            this.patchesToLoad[path] = patch;
            sendAsyncMessage(IPCAction.LOAD_HUNKS, {
                sha: this.state.commit.sha,
                path
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
                <h4><StaticLink href={`/fulldiff/${this.state.commit.sha}`}>Commit {this.state.commit.sha}</StaticLink></h4>
                <p>Parent: <StaticLink href={`/commit/${this.state.commit.parent.sha}`}>{this.state.commit.parent.sha.substring(0,7)}</StaticLink></p>
                <p class="date">authored: {new Date(this.state.commit.date).toLocaleString()}</p>
                <p class="author">author: {this.state.commit.author.name} &lt;{this.state.commit.author.email}&gt;</p>
                <hr />
                <div class="msg">
                    <h4>{title}</h4>
                    {message.filter(line => !!line).map(line => <p><pre>{line}</pre></p>)}
                </div>
                <hr />
                <p>{!this.state.loadingComplete && <span>Loading...</span>}Files: {this.state.patch.length}</p>
                <input type="text" onKeyUp={this.filterFiles} placeholder="Search file..." />
                <ul class="diff-view tree-list" key={this.state.commit.sha}>
                    {this.state.loadingComplete && this.renderPatches(this.state.patch)}
                </ul>
            </div>
        );
    }
    renderPatches = (patches: PatchObj[]) => {
        if (this.state.fileFilter) {
            return patches.filter(patch => patch.actualFile.path.includes(this.state.fileFilter)).map(this.renderPatch);
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
                <a href="#" onClick={e => this.toggleFile(e, patch.actualFile.path)}><h4><span className={typeCss}>{patch.type}</span> {patch.actualFile.path}</h4></a>
                <ul class="tree-list">
                    <li>
                        <p>Additions: {patch.lineStats.total_additions}, Deletions: {patch.lineStats.total_deletions}</p>
                        <ul>
                            { patch.hunks && patch.hunks.map(this.renderHunk) }
                        </ul>
                    </li>
                </ul>
            </li>
        );
    }
    
    renderHunk = (hunk: HunkObj) => {
        return (
            <li>
                <p class="diff-header">{hunk.header}</p>
                <table>
                    { hunk.lines && hunk.lines.map(this.renderLine) }
                </table>
            </li>
        );
    }
    
    renderLine = (line: LineObj) => {
        return (
            <tr class={line.type && `diff-line ${line.type === "+" ? "added" : "deleted"}` || "diff-line"}>
                <td class="diff-type">{line.type}</td>
                <td class="diff-line-number old">{line.oldLineno !== -1 && line.oldLineno}</td>
                <td class="diff-line-number new">{line.newLineno !== -1 && line.newLineno}</td>
                <td class="diff-line-content">{line.content}</td>
            </tr>
        );
    }
}
