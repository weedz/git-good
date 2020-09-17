import { h, Component } from "preact";
import { HunkObj, LineObj } from "src/Data/Actions";
import { Store, unsubscribe, subscribe, closeFile } from "src/Data/Renderer/store";
import { DELTA } from "src/Data/Utils";

import "./style.css";

type State = {
    viewType: "inline" | "side-by-side"
    sideSelected: "left" | "right" | null
    wrapLine: boolean
}

export default class FileDiff extends Component<{}, State> {
    constructor() {
        super();
        this.state = {
            viewType: "inline",
            sideSelected: null,
            wrapLine: true,
        };
    }
    componentWillMount() {
        subscribe(this.update, "currentFile");
    }
    componentWillUnmount() {
        unsubscribe(this.update, "currentFile");
    }
    update = () => {
        this.setState({});
    }

    renderHunk = (hunk: HunkObj) => {
        let lines;
        if (hunk.lines) {
            lines = this.state.viewType === "side-by-side" ? hunk.lines.map(this.renderLineSideBySide) : hunk.lines.map(this.renderLine);
        }
        return (
            <li>
                <p className="diff-header">{hunk.header}</p>
                <table cellSpacing="0px" cellPadding="2px">
                    {lines}
                </table>
            </li>
        );
    }
    
    renderLine = (line: LineObj) => {
        return (
            <tr className={line.type && `diff-line ${line.type === "+" ? "new" : "old"}` || "diff-line"}>
                <td className="diff-line-number">{line.oldLineno !== -1 && line.oldLineno}</td>
                <td className="diff-line-number">{line.newLineno !== -1 && line.newLineno}</td>
                <td className="diff-type">{line.type}</td>
                <td className="diff-line-content">{line.content}</td>
            </tr>
        );
    }
    
    renderLineSideBySide = (line: LineObj) => {
        const oldLineNo = line.oldLineno !== -1 && line.oldLineno;
        const newLineNo = line.newLineno !== -1 && line.newLineno;
        const type = !!line.type;
        const oldType = type && oldLineNo ? " old" : "";
        const newType = type && newLineNo ? " new" : "";
        return (
            <tr className="diff-line">
                <td onMouseDown={this.selectLeft} className={`left diff-line-number${oldType}`}>{oldLineNo}</td>
                <td onMouseDown={this.selectLeft} className={`left diff-type${oldType}`}>{oldLineNo && line.type}</td>
                <td onMouseDown={this.selectLeft} className={`left diff-line-content${oldType}`}>{!type || oldLineNo ? line.content : null}</td>
                <td onMouseDown={this.selectRight} className={`right diff-line-number${newType}`}>{newLineNo}</td>
                <td onMouseDown={this.selectRight} className={`right diff-type${newType}`}>{newLineNo && line.type}</td>
                <td onMouseDown={this.selectRight} className={`right diff-line-content${newType}`}>{!type || newLineNo ? line.content : null}</td>
            </tr>
        );
    }

    selectLeft =() => {
        this.setState({sideSelected: "left"});
    }
    selectRight =() => {
        this.setState({sideSelected: "right"});
    }

    render() {
        if (!Store.currentFile) {
            return;
        }
        const patch = Store.currentFile.patch;

        const classes = [];
        if (this.state.sideSelected) {
            classes.push(`${this.state.sideSelected}-side-selected`);
        }
        if (this.state.wrapLine) {
            classes.push("wrap-content");
        }
        if (this.state.viewType === "side-by-side") {
            classes.push("parallel");
        }

        return (
            <div id="file-diff" className={`pane ${classes.join(" ")}`}>
                <a href="#" onClick={closeFile}>Close</a>
                <h1>{patch.actualFile.path}</h1>
                {patch.status === DELTA.RENAMED && <h4>{patch.oldFile.path} &rArr; {patch.newFile.path} ({patch.similarity}%)</h4>}
                <p>Additions: {patch.lineStats.total_additions}, Deletions: {patch.lineStats.total_deletions}</p>
                <div className="btn-group">
                    <button onClick={() => this.setState({viewType: "inline"})}>Inline</button>
                    <button onClick={() => this.setState({viewType: "side-by-side"})}>Side-by-side</button>
                    <label>
                        <span>Wrap line</span>
                        <input checked={this.state.wrapLine} type="checkbox" onClick={(e) => this.setState({wrapLine: (e.target as unknown as HTMLInputElement).checked})}></input>
                    </label>
                </div>
                {patch.hunks ? <ul>{patch.hunks.map(this.renderHunk)}</ul> : <p>Loading content...</p>}
            </div>
        );
    }
}
