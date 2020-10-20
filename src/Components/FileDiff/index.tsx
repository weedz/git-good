import { h, Component } from "preact";
import { HunkObj, LineObj } from "src/Data/Actions";
import { Store, unsubscribe, subscribe, closeFile, blameFile } from "src/Data/Renderer/store";
import { DELTA } from "src/Data/Utils";

import "./style.css";

type State = {
    diffType: "inline" | "side-by-side"
    viewType: "file" | "diff"
    sideSelected: "left" | "right" | null
    wrapLine: boolean
}

function compactLines(lines: LineObj[]) {
    const parsedLines = [];
    let oldLines: any[] = [];

    for (const line of lines)
    {
        if (line.type === "-") {
            oldLines.push(line);
            parsedLines.push(line);
        }
        else if (line.type === "+" && oldLines.length > 0) {
            const oldLine = oldLines.shift();
            oldLine.newContent = line;
        } else {
            oldLines = [];
            parsedLines.push(line);
        }
    }

    return parsedLines;
}

export default class FileDiff extends Component<{}, State> {
    constructor() {
        super();
        this.state = {
            viewType: "diff",
            diffType: "inline",
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
            lines = this.state.diffType === "side-by-side" ? compactLines(hunk.lines).map(this.renderLineSideBySide) : hunk.lines.map(this.renderLine);
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
    
    renderLineSideBySide = (line: any) => {
        const newLine = line.newContent || line;

        const oldLineNo = line.oldLineno !== -1 && line.oldLineno;
        const newLineNo = newLine.newLineno !== -1 && newLine.newLineno;
        const type = !!line.type;
        const oldType = type && oldLineNo ? " old" : "";
        const newType = type && newLineNo ? " new" : "";
        return (
            <tr className="diff-line">
                <td onMouseDown={this.selectLeft} className={`left diff-line-number${oldType}`}>{oldLineNo}</td>
                <td onMouseDown={this.selectLeft} className={`left diff-type${oldType}`}>{oldLineNo && line.type}</td>
                <td onMouseDown={this.selectLeft} className={`left diff-line-content${oldType}`}>{!type || oldLineNo && line.content}</td>
                <td onMouseDown={this.selectRight} className={`right diff-line-number${newType}`}>{newLineNo}</td>
                <td onMouseDown={this.selectRight} className={`right diff-type${newType}`}>{newLineNo && newLine.type}</td>
                <td onMouseDown={this.selectRight} className={`right diff-line-content${newType}`}>{!type || newLineNo && newLine.content}</td>
            </tr>
        );
    }

    selectLeft = () => {
        if (this.state.sideSelected !== "left") {
            window.getSelection()?.removeAllRanges();
            this.setState({sideSelected: "left"});
        }
    }
    selectRight = () => {
        if (this.state.sideSelected !== "right") {
            window.getSelection()?.removeAllRanges();
            this.setState({sideSelected: "right"});
        }
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
        if (this.state.diffType === "side-by-side") {
            classes.push("parallel");
        }

        return (
            <div id="file-diff" className={`pane ${classes.join(" ")}`}>
                <a href="#" onClick={closeFile}>Close</a>
                <h1>{patch.actualFile.path}</h1>
                {patch.status === DELTA.RENAMED && <h4>{patch.oldFile.path} &rArr; {patch.newFile.path} ({patch.similarity}%)</h4>}
                <p>{patch.hunks?.length} chunks, Additions: {patch.lineStats.total_additions}, Deletions: {patch.lineStats.total_deletions}</p>
                <ul className="horizontal space-evenly">
                    <li className="btn-group">
                        <button onClick={() => this.setState({viewType: "file"})}>File View</button>
                        <button onClick={() => this.setState({viewType: "diff"})}>Diff View</button>
                    </li>
                    <li className="btn-group">
                        <button onClick={() => blameFile(patch.actualFile.path)}>History</button>
                    </li>
                    <li className="btn-group">
                        <button onClick={() => this.setState({diffType: "inline"})}>Inline</button>
                        <button onClick={() => this.setState({diffType: "side-by-side"})}>Side-by-side</button>
                    </li>
                </ul>
                <label>
                    <span>Wrap line</span>
                    <input checked={this.state.wrapLine} type="checkbox" onClick={(e) => this.setState({wrapLine: (e.target as unknown as HTMLInputElement).checked})}></input>
                </label>
                {patch.hunks ? <ul className="hunks">{patch.hunks.map(this.renderHunk)}</ul> : <p>Loading content...</p>}
            </div>
        );
    }
}
