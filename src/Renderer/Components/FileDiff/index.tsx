import { h } from "preact";
import { HunkObj, IpcAction, LineObj, LoadFileCommitsReturn } from "../../../Common/Actions";
import { DiffDelta } from "../../../Common/Utils";
import { closeFile, dismissibleWindowClosed, glyphWidth, openFileHistory, showDismissibleWindow } from "../../Data";
import { Store, PureStoreComponent, updateStore, StoreType, saveAppConfig } from "../../Data/store";
import FileHistory from "./FileHistory";
import HunksContainer from "./HunksContainer";

import "./style.css";

const LINE_HEIGHT = 17;

interface State {
    fullWidth: boolean
    wrapLine: boolean
    lines: Array<{
        type: string
        content: string
        line?: LineObj
    }>
    fileHistory: null | LoadFileCommitsReturn["commits"]
}

// TODO: Fix this..
function compactLines(lines: State["lines"]) {
    const oldLines: State["lines"] = [];
    const newLines: State["lines"] = [];

    const emptyLine = {
        content: "",
        type: "",
    };

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
                oldLines.push(emptyLine);
            }
            oldLines.push(lineObj);

            for (; diffLines < 0; ++diffLines) {
                newLines.push(emptyLine);
            }
            newLines.push(lineObj);
        }
    }
    for (; diffLines > 0; --diffLines) {
        oldLines.push(emptyLine);
    }
    for (; diffLines < 0; ++diffLines) {
        newLines.push(emptyLine);
    }

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
        this.listen("diffUi");
        this.registerHandler(IpcAction.LOAD_FILE_COMMITS, commitsResult => {
            if (commitsResult) {
                this.setState({
                    fileHistory: commitsResult.commits || null
                });
            }
        });
    }

    componentWillUnmount() {
        dismissibleWindowClosed(this.closeActiveFileDiff);
        this.oldLinesContainer = null;
        this.newLinesContainer = null;
    }

    renderHunks = (newStore: StoreType["currentFile"]) => {
        if (newStore?.patch) {
            showDismissibleWindow(this.closeActiveFileDiff);
        }
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
        this.longestLine = Math.max(this.longestLine, hunk.header.replaceAll("\t", "    ").length);
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
        if (!Store.diffUi.sideBySide) {
            hunks = <HunksContainer itemHeight={LINE_HEIGHT} width={this.longestLine * glyphWidth()} items={this.state.lines} />;
        } else {
            const [oldLines, newLines] = compactLines(this.state.lines);
            hunks = <div style={{
                display: "flex",
                flexDirection: "row",
                overflowY: "auto",
            }}>
                <HunksContainer itemHeight={LINE_HEIGHT} onRef={(ref) => {
                    this.oldLinesContainer = ref;
                }} scrollCallback={el => {
                    if (this.newLinesContainer) {
                        this.newLinesContainer.sync = true;
                        this.newLinesContainer.containerRef.current?.scrollTo({
                            left: el.scrollLeft,
                            top: el.scrollTop
                        });
                    }
                }} width={this.longestLine * glyphWidth()} items={oldLines} hideNewGlyphs />
                <HunksContainer itemHeight={LINE_HEIGHT} onRef={(ref) => {
                    this.newLinesContainer = ref;
                }} scrollCallback={el => {
                    if (this.oldLinesContainer) {
                        this.oldLinesContainer.sync = true;
                        this.oldLinesContainer.containerRef.current?.scrollTo({
                            left: el.scrollLeft,
                            top: el.scrollTop
                        })
                    }
                }} width={this.longestLine * glyphWidth()} items={newLines} hideOldGlyphs />
            </div>;
        }

        return (
            <div class={`${classes.join(" ")}`} id="file-diff-container">
                {!!this.state.fileHistory && <FileHistory openFileHistory={path => {
                    this.setState({
                        fileHistory: []
                    });
                    openFileHistory(path);
                }} fileHistory={this.state.fileHistory} />}
                <div id="file-diff" class="pane">
                    <h2>{patch.actualFile.path}<a href="#" onClick={this.closeActiveFileDiff}>&times;</a></h2>
                    {patch.status === DiffDelta.RENAMED && <h4>{patch.oldFile.path} &rArr; {patch.newFile.path} ({patch.similarity}%)</h4>}
                    <p>{patch.hunks?.length} chunks,&nbsp;<span class="added">+{patch.lineStats.total_additions}</span>&nbsp;<span class="deleted">-{patch.lineStats.total_deletions}</span></p>
                    <ul class="file-diff-toolbar flex-row">
                        <li class="btn-group">
                            <button class={this.state.fileHistory ? "active" : undefined} onClick={() => {
                                this.setState({fileHistory: []});
                                openFileHistory(patch.actualFile.path, Store.currentFile?.commitSHA);
                            }}>History</button>
                        </li>
                        <li class="btn-group">
                            <button class={this.state.fullWidth ? "active" : undefined} onClick={() => this.setState({fullWidth: !this.state.fullWidth})}>Fullscreen</button>
                        </li>
                        <li>
                            <button class={Store.diffOptions.ignoreWhitespace ? "active" : undefined} onClick={() => setDiffOption("ignoreWhitespace", !Store.diffOptions.ignoreWhitespace)}>Ignore whitespace</button>
                        </li>
                        <li class="btn-group">
                            <button class={Store.diffUi.sideBySide ? "active" : undefined} onClick={() => setDiffUiOption("sideBySide", !Store.diffUi.sideBySide)}>Side-by-side</button>
                        </li>
                    </ul>
                    {hunks}
                </div>
            </div>
        );
    }
}

function setDiffOption(option: keyof StoreType["diffOptions"], value: boolean) {
    if (!Store.appConfig) {
        return;
    }
    const diffOptions = Object.assign({}, Store.diffOptions, {[option]: value });
    const appConfig = Store.appConfig;
    appConfig.diffOptions = diffOptions;
    saveAppConfig(appConfig);
}
function setDiffUiOption(option: keyof StoreType["diffUi"], value: boolean) {
    const diffUi = Store.diffUi;
    diffUi[option] = value;
    updateStore({ diffUi });
}
