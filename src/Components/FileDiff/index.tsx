import { h, Component } from "preact";
import { HunkObj, LineObj } from "src/Data/Actions";
import { Store, unsubscribe, subscribe, closeFile, blameFile } from "src/Data/Renderer/store";
import { DELTA } from "src/Data/Utils";

import "./style.css";

const PAGE_SIZE = 1000;

type State = {
    diffType: "inline" | "side-by-side"
    viewType: "file" | "diff"
    sideSelected: "left" | "right" | null
    wrapLine: boolean
    viewPort: {
        start: number
        end: number
    }
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
    lines: h.JSX.Element[] = [];

    constructor() {
        super();
        this.state = {
            viewType: "diff",
            diffType: "inline",
            sideSelected: null,
            wrapLine: true,
            viewPort: {
                start: 0,
                end: PAGE_SIZE,
            }
        };
    }
    componentWillMount() {
        subscribe(this.renderHunks, "currentFile");
    }
    componentWillUnmount() {
        unsubscribe(this.renderHunks, "currentFile");
    }

    renderHunks = () => {
        const patch = Store.currentFile?.patch;
        if (patch) {
            this.lines = patch.hunks ? patch.hunks.map(this.renderHunk).flat() : [];
        }
        this.setState({
            viewPort: {
                start: 0,
                end: PAGE_SIZE,
            }
        });
    }

    renderHunk = (hunk: HunkObj) => {
        let lines = [
            <li className="diff-header">
                <p>{hunk.header}</p>
            </li>
        ];
        if (hunk.lines) {
            lines = lines.concat(this.state.diffType === "side-by-side" ? compactLines(hunk.lines).map(this.renderLineSideBySide) : hunk.lines.map(this.renderLine));
        }

        return lines;
    }
    
    renderLine = (line: LineObj) => {
        return (
            <li className={line.type && `diff-line ${line.type === "+" ? "new" : "old"}` || "diff-line"}>
                <span className="diff-line-number">{line.oldLineno !== -1 && line.oldLineno}</span>
                <span className="diff-line-number">{line.newLineno !== -1 && line.newLineno}</span>
                <span className="diff-type">{line.type}</span>
                <span className="diff-line-content">{line.content}</span>
            </li>
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
            <li className="diff-line">
                <span onMouseDown={this.selectLeft} className={`left diff-line-number${oldType}`}>{oldLineNo}</span>
                <span onMouseDown={this.selectLeft} className={`left diff-type${oldType}`}>{oldLineNo && line.type}</span>
                <span onMouseDown={this.selectLeft} className={`left diff-line-content${oldType}`}>{!type || oldLineNo ? line.content : null}</span>
                <span onMouseDown={this.selectRight} className={`right diff-line-number${newType}`}>{newLineNo}</span>
                <span onMouseDown={this.selectRight} className={`right diff-type${newType}`}>{newLineNo && newLine.type}</span>
                <span onMouseDown={this.selectRight} className={`right diff-line-content${newType}`}>{!type || newLineNo ? newLine.content : null}</span>
            </li>
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

        const renderedLines = this.lines.slice(this.state.viewPort.start, this.state.viewPort.end) || [<p>Loading content...</p>];

        return (
            <div id="file-diff" className={`pane ${classes.join(" ")}`}>
                <a href="#" onClick={closeFile}>Close</a>
                <h1>{patch.actualFile.path}</h1>
                {patch.status === DELTA.RENAMED && <h4>{patch.oldFile.path} &rArr; {patch.newFile.path} ({patch.similarity}%)</h4>}
                <p>{patch.hunks?.length} chunks, Additions: {patch.lineStats.total_additions}, Deletions: {patch.lineStats.total_deletions}</p>
                <ul className="horizontal space-evenly">
                    <li className="btn-group">
                        <button onClick={() => this.setState({viewType: "file"}, this.renderHunks)}>File View</button>
                        <button onClick={() => this.setState({viewType: "diff"}, this.renderHunks)}>Diff View</button>
                    </li>
                    <li className="btn-group">
                        <button onClick={() => blameFile(patch.actualFile.path)}>History</button>
                    </li>
                    <li className="btn-group">
                        <button onClick={() => this.setState({diffType: "inline"}, this.renderHunks)}>Inline</button>
                        <button onClick={() => this.setState({diffType: "side-by-side"}, this.renderHunks)}>Side-by-side</button>
                    </li>
                </ul>
                <label>
                    <span>Wrap line</span>
                    <input checked={this.state.wrapLine} type="checkbox" onClick={(e) => this.setState({wrapLine: (e.target as unknown as HTMLInputElement).checked})}></input>
                </label>
                <ul className={`hunks ${this.state.diffType}`}>{renderedLines}</ul>
                <div className="horizontal">
                    <button disabled={this.state.viewPort.start <= 0} onClick={() => this.state.viewPort.start >= PAGE_SIZE && this.setState({viewPort: {
                        ...this.state.viewPort,
                        start: this.state.viewPort.start - 1000,
                        end: this.state.viewPort.end - 1000,
                    }})}>Prev</button>
                    <button disabled={this.state.viewPort.end >= this.lines.length}  onClick={() => this.state.viewPort.end < this.lines.length && this.setState({viewPort: {
                        ...this.state.viewPort,
                        start: this.state.viewPort.start + 1000,
                        end: this.state.viewPort.end + 1000,
                    }})}>Next</button>
                </div>
            </div>
        );
    }
}
