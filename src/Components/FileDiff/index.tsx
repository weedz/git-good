import { h } from "preact";
import { HunkObj, IpcAction, LineObj, IpcActionReturn } from "src/Data/Actions";
import { Store, closeFile, blameFile, PureStoreComponent, updateStore } from "src/Data/Renderer/store";
import { DELTA, formatTimeAgo } from "src/Data/Utils";
import Link from "../Link";
import HunksContainer from "./HunksContainer";

import "./style.css";

type State = {
    diffType: "inline" | "side-by-side"
    viewType: "file" | "diff"
    fullWidth: boolean
    wrapLine: boolean
    lines: Array<{
        type: string
        content: string
        line?: LineObj
    }>
    fileHistory: IpcActionReturn[IpcAction.LOAD_FILE_COMMITS]["commits"]
}

// Current font and size might be closer to 7.80.
// Could possibly be calculated "on the fly" somehow, but that is a problem for when we change font...
const FONT_WIDTH = 7.85;

// function compactLines(lines: LineObj[]) {
//     const parsedLines = [];
//     let oldLines: Array<LineObj & {newContent?: LineObj}> = [];

//     for (const line of lines)
//     {
//         if (line.type === "-") {
//             oldLines.push(line);
//             parsedLines.push(line);
//         }
//         else if (line.type === "+" && oldLines.length > 0) {
//             const oldLine = oldLines.shift();
//             if (oldLine) {
//                 oldLine.newContent = line;
//             }
//         } else {
//             oldLines = [];
//             parsedLines.push(line);
//         }
//     }

//     return parsedLines;
// }

export default class FileDiff extends PureStoreComponent<unknown, State> {
    longestLine = 0;
    state: State = {
        viewType: "diff",
        diffType: "inline",
        wrapLine: false,
        lines: [],
        fullWidth: false,
        fileHistory: []
    };
    componentDidMount() {
        this.listen("currentFile", this.renderHunks);
        this.registerHandler(IpcAction.LOAD_FILE_COMMITS, commitsResult => {
            this.setState({
                fileHistory: commitsResult.commits
            });
        });
    }

    renderHunks = () => {
        const patch = Store.currentFile?.patch;
        this.longestLine = 0;
        this.setState({
            lines: patch?.hunks ? patch.hunks.map(this.renderHunk).flat() : []
        });
    }

    renderHunk = (hunk: HunkObj) => {
        let lines = [
            { type:"",content:"" },
            {
                type: "header",
                content: hunk.header
            }
        ];
        if (hunk.lines) {
            lines = lines.concat(hunk.lines.map(this.renderLine));
        }

        return lines;
    }
    
    renderLine = (line: LineObj) => {
        // calculate "longest line"
        this.longestLine = Math.max(this.longestLine, line.content.replaceAll("\t", "    ").length);
        return {
            type: "line",
            content: line.content,
            line
        }
    }

    closeActiveFileDiff = () => {
        if (this.state.fileHistory.length) {
            this.setState({
                fileHistory: []
            });
        }
        closeFile();
    }
    
    // renderLineSideBySide = (line: LineObj & {newContent?: LineObj}) => {
    //     const newLine = line.newContent || line;

    //     const oldLineNo = line.oldLineno !== -1 && line.oldLineno;
    //     const newLineNo = newLine.newLineno !== -1 && newLine.newLineno;
    //     const type = !!line.type;
    //     const oldType = type && oldLineNo ? " old" : "";
    //     const newType = type && newLineNo ? " new" : "";
    //     return (
    //         <li className="diff-line">
    //             <span onMouseDown={this.selectLeft} className={`left diff-line-number${oldType}`}>{oldLineNo}</span>
    //             <span onMouseDown={this.selectLeft} className={`left diff-type${oldType}`}>{oldLineNo && line.type}</span>
    //             <span onMouseDown={this.selectLeft} className={`left diff-line-content${oldType}`}>{!type || oldLineNo ? line.content : null}</span>
    //             <span onMouseDown={this.selectRight} className={`right diff-line-number${newType}`}>{newLineNo}</span>
    //             <span onMouseDown={this.selectRight} className={`right diff-type${newType}`}>{newLineNo && newLine.type}</span>
    //             <span onMouseDown={this.selectRight} className={`right diff-line-content${newType}`}>{!type || newLineNo ? newLine.content : null}</span>
    //         </li>
    //     );
    // }

    render() {
        if (!Store.currentFile) {
            return;
        }
        const patch = Store.currentFile.patch;

        const classes = [];
        if (this.state.wrapLine) {
            classes.push("wrap-content");
        }
        if (this.state.diffType === "side-by-side") {
            classes.push("parallel");
        }
        if (this.state.fullWidth) {
            classes.push("full-width");
        }

        return (
            <div className={`pane ${classes.join(" ")}`} id="file-diff-container">
                {!!this.state.fileHistory.length && (
                <div id="file-history-commits">
                    <h4>File history</h4>
                    <ul>
                        {this.state.fileHistory.slice(0,50).map(
                            commit => (
                            <li>
                                <Link title={commit.message} className="flex-column">
                                    <div className="flex-row">
                                        <span className="msg">{commit.message.substring(0, commit.message.indexOf("\n")>>>0 || 60)}</span>
                                    </div>
                                    <div className="flex-row space-between">
                                        <span>{commit.sha.substring(0,8)}</span>
                                        <span className="date">{formatTimeAgo(new Date(commit.date))}</span>
                                    </div>
                                </Link>
                            </li>
                            )
                        )}
                    </ul>
                </div>
                )}
                <div id="file-diff">
                    <h2>{patch.actualFile.path}<a href="#" onClick={this.closeActiveFileDiff}>🗙</a></h2>
                    {patch.status === DELTA.RENAMED && <h4>{patch.oldFile.path} &rArr; {patch.newFile.path} ({patch.similarity}%)</h4>}
                    <p>{patch.hunks?.length} chunks,&nbsp;<span className="added">+{patch.lineStats.total_additions}</span>&nbsp;<span className="deleted">-{patch.lineStats.total_deletions}</span></p>
                    <ul className="horizontal space-evenly">
                        <li className="btn-group">
                            <button onClick={() => 0 && this.setState({viewType: "file"}, this.renderHunks)}>File View</button>
                            <button className={this.state.viewType === "diff" ? "active" : undefined} onClick={() => this.setState({viewType: "diff"}, this.renderHunks)}>Diff View</button>
                        </li>
                        <li className="btn-group">
                            <button className={this.state.fileHistory.length ? "active" : undefined} onClick={() => {
                                if (!this.state.fileHistory.length) {
                                    this.setState({fullWidth: true});
                                    blameFile(patch.actualFile.path);
                                }
                            }}>History</button>
                            <button onClick={() => {
                                console.log("BLAME. Noop.")
                            }}>Blame</button>
                        </li>
                        <li className="btn-group">
                            <button className={this.state.diffType === "inline" ? "active" : undefined} onClick={() => this.setState({diffType: "inline"}, this.renderHunks)}>Inline</button>
                            <button onClick={() => 0 && this.setState({diffType: "side-by-side"}, this.renderHunks)}>Side-by-side</button>
                        </li>
                        <li className="btn-group">
                            <button className={this.state.fullWidth ? "active" : undefined} onClick={() => this.setState({fullWidth: !this.state.fullWidth})}>Fullscreen</button>
                        </li>
                        <li>
                            <button className={Store.diffOptions.ignoreWhitespace ? "active" : undefined} onClick={() => updateStore({diffOptions: {ignoreWhitespace: !Store.diffOptions.ignoreWhitespace}})}>Ignore whitespace</button>
                        </li>
                    </ul>
                    <HunksContainer itemHeight={17} width={this.longestLine * FONT_WIDTH} items={this.state.lines} />
                </div>
            </div>
        );
    }
}
