import { h, Component } from "preact";
import { HunkObj, LineObj } from "../../Data/Actions";
import { Store, unsubscribe, subscribe, closeFile } from "../../Data/Renderer/store";
import { DELTA } from "src/Data/Utils";

import "./style.css";

function renderHunk(hunk: HunkObj) {
    return (
        <li>
            <p class="diff-header">{hunk.header}</p>
            <table cellSpacing="0px" cellPadding="2px">
                { hunk.lines && hunk.lines.map(renderLine) }
            </table>
        </li>
    );
}

function renderLine(line: LineObj) {
    return (
        <tr class={line.type && `diff-line ${line.type === "+" ? "added" : "deleted"}` || "diff-line"}>
            <td class="diff-type">{line.type}</td>
            <td class="diff-line-number old">{line.oldLineno !== -1 && line.oldLineno}</td>
            <td class="diff-line-number new">{line.newLineno !== -1 && line.newLineno}</td>
            <td class="diff-line-content">{line.content}</td>
        </tr>
    );
}

export default class FileDiff extends Component {
    componentWillMount() {
        subscribe(this.update, "currentFile");
    }
    componentWillUnmount() {
        unsubscribe(this.update, "currentFile");
    }
    update = () => {
        this.setState({});
    }
    render() {
        if (!Store.currentFile) {
            return;
        }
        const patch = Store.currentFile.patch;
        return (
            <div id="file-diff" className="pane">
                <a href="#" onClick={closeFile}>Close</a>
                <h1>{patch.actualFile.path}</h1>
                {patch.status === DELTA.RENAMED && <h4>{patch.oldFile.path} &rArr; {patch.newFile.path} ({patch.similarity}%)</h4>}
                {/* <p>Additions: {patch.lineStats.total_additions}, Deletions: {patch.lineStats.total_deletions}</p> */}
                <ul>
                    { patch.hunks && patch.hunks.map(renderHunk) }
                </ul>
            </div>
        );
    }
}
