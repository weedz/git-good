import { h } from "preact";
import { HunkObj, IpcAction, LineObj, IpcActionReturn } from "../../Data/Actions";
import { glyphWidth } from "../../Data/Renderer";
import { Store, closeFile, openFileHistory, PureStoreComponent, updateStore, StoreType } from "../../Data/Renderer/store";
import { DELTA } from "../../Data/Utils";
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

// TODO: Fix this..
function compactLines(lines: Array<{
    type: string
    content: string
    line?: LineObj
}>) {
    const oldLines: Array<{
        type: string
        content: string
        line?: LineObj
    }> = [];

    const newLines: Array<{
        type: string
        content: string
        newContent?: LineObj
        line?: LineObj
    }> = [];

    let diffLines = 0;

    for (const lineObj of lines) {
        const line = lineObj.line;
        if (line?.type === "-") {
            --diffLines;
            oldLines.push(lineObj);
        } else if (line?.type === "+") {
            ++diffLines;
            newLines.push(lineObj);
        }
        else {
            for (; diffLines > 0; --diffLines) {
                oldLines.push({
                    content: "",
                    type: ""
                });
            }
            oldLines.push(lineObj);

            for (; diffLines < 0; ++diffLines) {
                newLines.push({
                    content: "",
                    type: ""
                });
            }
            newLines.push(lineObj);
        }
    }
    for (; diffLines > 0; --diffLines) {
        oldLines.push({
            content: "",
            type: ""
        });
    }
    for (; diffLines < 0; ++diffLines) {
        newLines.push({
            content: "",
            type: ""
        });
    }

    // console.log("parsedLines:", parsedLines);

    return [oldLines, newLines];
}

export default class FileDiff extends PureStoreComponent<unknown, State> {
    longestLine = 0;
    state: State = {
        wrapLine: false,
        lines: [],
        fullWidth: false,
        fileHistory: null
    };


    oldLinesContainer: HunksContainer | null = null;
    newLinesContainer: HunksContainer | null = null;


    componentDidMount() {
        this.listen("currentFile", this.renderHunks);
        this.registerHandler(IpcAction.LOAD_FILE_COMMITS, commitsResult => {
            this.setState({
                fileHistory: commitsResult.commits || null
            });
        });
    }

    componentWillUnmount() {
        this.oldLinesContainer = null;
        this.newLinesContainer = null;
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

    render() {
        if (!Store.currentFile) {
            return;
        }
        const patch = Store.currentFile.patch;

        const classes = [];
        if (this.state.fullWidth) {
            classes.push("full-width");
        }

        let hunks;
        if (!Store.diffOptions.sideBySide) {
            hunks = <HunksContainer itemHeight={17} width={this.longestLine * glyphWidth()} items={this.state.lines} />;
        } else {
            // console.time("Compact Lines");
            const [oldLines, newLines] = compactLines(this.state.lines);
            // console.timeEnd("Compact Lines");
            hunks = <div style={{
                display: "flex",
                flexDirection: "row",
                overflowY: "auto",
            }}>
                <HunksContainer itemHeight={17} onRef={(ref) => {
                    this.oldLinesContainer = ref;
                }} scrollCallback={el => {
                    if (this.newLinesContainer) {
                        this.newLinesContainer.sync = true;
                        this.newLinesContainer.containerRef.current?.scrollTo({
                            left: el.scrollLeft,
                            top: el.scrollTop
                        });
                    }
                }} width={this.longestLine * glyphWidth()} items={oldLines} />
                <HunksContainer itemHeight={17} onRef={(ref) => {
                    this.newLinesContainer = ref;
                }} scrollCallback={el => {
                    if (this.oldLinesContainer) {
                        this.oldLinesContainer.sync = true;
                        this.oldLinesContainer.containerRef.current?.scrollTo({
                            left: el.scrollLeft,
                            top: el.scrollTop
                        })
                    }
                }} width={this.longestLine * glyphWidth()} items={newLines} />
            </div>;
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
                            <button className={Store.diffOptions.ignoreWhitespace ? "active" : undefined} onClick={() => setDiffOption("ignoreWhitespace", !Store.diffOptions.ignoreWhitespace)}>Ignore whitespace</button>
                        </li>
                        <li className="btn-group">
                            <button className={Store.diffOptions.sideBySide ? "active" : undefined} onClick={() => setDiffOption("sideBySide", !Store.diffOptions.sideBySide)}>Side-by-side</button>
                        </li>
                    </ul>
                    {hunks}
                </div>
            </div>
        );
    }
}

function setDiffOption(option: keyof StoreType["diffOptions"], value: boolean) {
    updateStore({
        diffOptions: {
            ...Store.diffOptions,
            [option]: value
        }
    })
}
