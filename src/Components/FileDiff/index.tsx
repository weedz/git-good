import { h } from "preact";
import { HunkObj, IpcAction, LineObj, IpcActionReturn } from "src/Data/Actions";
import { Store, closeFile, openFileHistory, PureStoreComponent, updateStore, glyphWidth, StoreType } from "src/Data/Renderer/store";
import { DELTA } from "src/Data/Utils";
import FileHistory from "./FileHistory";
import HunksContainer from "./HunksContainer";

import "./style.css";

type State = {
    fullWidth: boolean
    wrapLine: boolean
    lines: Array<{
        type: string
        content: string
        line?: LineObj
    }>
    fileHistory: null | IpcActionReturn[IpcAction.LOAD_FILE_COMMITS]["commits"]
}

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
        wrapLine: false,
        lines: [],
        fullWidth: false,
        fileHistory: null
    };
    componentDidMount() {
        this.listen("currentFile", this.renderHunks);
        this.registerHandler(IpcAction.LOAD_FILE_COMMITS, commitsResult => {
            this.setState({
                fileHistory: commitsResult.commits || null
            });
        });
    }

    renderHunks = (newStore?: StoreType["currentFile"]) => {
        const patch = newStore?.patch;
        this.longestLine = 0;
        this.setState({
            lines: patch?.hunks ? patch.hunks.map(this.renderHunk).flat() : [],
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
        if (this.state.fileHistory) {
            this.setState({
                fileHistory: null
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
        if (this.state.fullWidth) {
            classes.push("full-width");
        }

        return (
            <div className={`${classes.join(" ")}`} id="file-diff-container">
                {!!this.state.fileHistory && <FileHistory openFileHistory={path => {
                    this.setState({
                        fileHistory: []
                    });
                    openFileHistory(path);
                }} fileHistory={this.state.fileHistory} />}
                <div id="file-diff" className="pane">
                    <h2>{patch.actualFile.path}<a href="#" onClick={this.closeActiveFileDiff}>&times;</a></h2>
                    {patch.status === DELTA.RENAMED && <h4>{patch.oldFile.path} &rArr; {patch.newFile.path} ({patch.similarity}%)</h4>}
                    <p>{patch.hunks?.length} chunks,&nbsp;<span className="added">+{patch.lineStats.total_additions}</span>&nbsp;<span className="deleted">-{patch.lineStats.total_deletions}</span></p>
                    <ul className="file-diff-toolbar flex-row">
                        <li className="btn-group">
                            <button className={this.state.fileHistory ? "active" : undefined} onClick={() => {
                                this.setState({fileHistory: []});
                                openFileHistory(patch.actualFile.path, Store.currentFile?.commitSHA);
                            }} disabled={!!this.state.fileHistory}>History</button>
                        </li>
                        <li className="btn-group">
                            <button className={this.state.fullWidth ? "active" : undefined} onClick={() => this.setState({fullWidth: !this.state.fullWidth})}>Fullscreen</button>
                        </li>
                        <li>
                            <button className={Store.diffOptions.ignoreWhitespace ? "active" : undefined} onClick={() => updateStore({diffOptions: {ignoreWhitespace: !Store.diffOptions.ignoreWhitespace}})}>Ignore whitespace</button>
                        </li>
                    </ul>
                    <HunksContainer itemHeight={17} width={this.longestLine * glyphWidth()} items={this.state.lines} />
                </div>
            </div>
        );
    }
}
