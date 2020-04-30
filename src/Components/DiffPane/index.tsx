import { h, Component } from "preact";
import { StaticLink, RoutableProps } from "@weedzcokie/router-tsx";
import { IPCAction, registerHandler, unregisterHandler } from "../../Data/Renderer";
import { sendAsyncMessage } from "../../Data/Renderer";
import { CommitObj, DiffObj, PatchObj, HunkObj, LineObj } from "../../Data/Provider";

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
export default class DiffPane extends Component<RoutableProps<Props>, {commit: CommitObj}> {
    componentWillMount() {
        registerHandler(IPCAction.LOAD_COMMIT, this.loadCommit);
        sendAsyncMessage(IPCAction.LOAD_COMMIT, this.props.commit);
    }
    componentWillReceiveProps(newProps: Props) {
        sendAsyncMessage(IPCAction.LOAD_COMMIT, newProps.commit);
    }
    componentWillUnmount() {
        unregisterHandler(IPCAction.LOAD_COMMIT, this.loadCommit);
    }
    loadCommit = (commit: any) => {
        this.setState({
            commit
        });
    }
    render() {
        if (!this.state.commit) {
            return (
                <p>Loading commit...</p>
            );
        }
        return (
            <div id="diff-pane" class="pane">
                <h4><StaticLink href={`/fulldiff/${this.state.commit.sha}`}>Commit {this.state.commit.sha}</StaticLink></h4>
                <p>Parent: <StaticLink href={`/commit/${this.state.commit.parent.sha}`}>{this.state.commit.parent.sha.substring(0,7)}</StaticLink></p>
                <p class="date">authored: {this.state.commit.date}</p>
                <p class="author">author: {this.state.commit.author.name} &lt;{this.state.commit.author.email}&gt;</p>
                <p class="msg">{this.state.commit.message}</p>
                <hr />
                <ul class="diff-view tree-list" key={this.state.commit.sha}>
                    {this.state.commit.diff.map(renderDiff)}
                </ul>
            </div>
        );
    }
}

function renderDiff(diff: DiffObj) {
    return (
        diff.patches.map(renderPatch)
    );
}

function renderPatch(patch: PatchObj) {
    return (
        <li class="sub-tree">
            <a href="#" onClick={toggleTreeItem}><h4>{patch.newFile.path} {patch.type}</h4></a>
            <ul class="tree-list">
                <li>
                    <p>Additions: {patch.lineStats.total_additions}, Deletions: {patch.lineStats.total_deletions}</p>
                    <ul>
                        {
                        patch.hunks.map(renderHunk)
                        }
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
                {
                hunk.lines.map(renderLine)
                }
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
