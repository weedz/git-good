import { h, Component } from "preact";
import { StaticLink, RoutableProps } from "@weedzcokie/router-tsx";
import { registerHandler, unregisterHandler } from "../../Data/Renderer";
import { sendAsyncMessage } from "../../Data/Renderer";
import { CommitObj, DiffObj, PatchObj, HunkObj, LineObj } from "../../Data/Provider";
import { IPCAction } from "../../Data/Actions";

import "./style";

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
}
export default class DiffPane extends Component<RoutableProps<Props>, State> {
    componentWillMount() {
        registerHandler(IPCAction.LOAD_COMMIT, this.loadCommit);
        registerHandler(IPCAction.PATCH_WITH_HUNKS, this.handlePatch);
        sendAsyncMessage(IPCAction.LOAD_COMMIT, this.props.commit);
        this.setState({
            commit: null,
            patch: []
        });
    }
    componentWillReceiveProps(newProps: Props) {
        sendAsyncMessage(IPCAction.LOAD_COMMIT, newProps.commit);
        this.setState({
            commit: null,
            patch: []
        });
    }
    componentWillUnmount() {
        unregisterHandler(IPCAction.LOAD_COMMIT, this.loadCommit);
        unregisterHandler(IPCAction.PATCH_WITH_HUNKS, this.handlePatch);
    }
    loadCommit = (commit: any) => {
        this.setState({
            commit
        });
    }
    handlePatch = (patch: any) => {
        this.setState({
            patch: [...this.state.patch, patch]
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
                <ul class="diff-view tree-list" key={this.state.commit.sha}>
                    {this.state.patch && this.state.patch.map(renderPatch)}
                </ul>
            </div>
        );
    }
}

function renderDiff(diff: DiffObj) {
    return (
        diff.patches && diff.patches.map(renderPatch)
    );
}

function renderPatch(patch: PatchObj) {
    return (
        <li class="sub-tree" key={patch.newFile.path.concat(patch.oldFile.path)}>
            <a href="#" onClick={toggleTreeItem}><h4>{patch.newFile.path} {patch.type}</h4></a>
            <ul class="tree-list">
                <li>
                    <p>Additions: {patch.lineStats.total_additions}, Deletions: {patch.lineStats.total_deletions}</p>
                    <ul>
                        { patch.hunks && patch.hunks.map(renderHunk) }
                    </ul>
                </li>
            </ul>
        </li>
    );
}

function renderHunk(hunk: HunkObj) {
    return (
        <li>
            <p class="diff-header">{hunk.header}</p>
            <ul>
                { hunk.lines && hunk.lines.map(renderLine) }
            </ul>
        </li>
    );
}

function renderLine(line: LineObj) {
    return (
        <li class={line.type && `diff-line ${line.type === "+" ? "added" : "deleted"}` || "diff-line"}>
            <span class="diff-type">{line.type}</span>
            <span class="diff-line-number">{line.type === "-" ? line.oldLineno : line.newLineno}</span>
            <pre class="diff-line-content">{line.content}</pre>
        </li>
    );
}
