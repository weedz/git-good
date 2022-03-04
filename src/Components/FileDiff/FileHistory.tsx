import { Diff } from "nodegit";
import { Component, h } from "preact";
import { ipcGetData } from "../../Data/Renderer/IPC";
import { IpcActionReturn, IpcAction } from "../../Data/Actions";
import { updateStore } from "../../Data/Renderer/store";
import { formatTimeAgo } from "../../Data/Utils";
import ScrollContainer from "../ScrollContainer";
import Link from "../Link";
import { showFileHistoryCommitMenu } from "./FileHistoryMenu";
import { filterCommit } from "../../Data/Renderer/Utility";
import { Links } from "../LinkContainer";

const ITEM_HEIGHT = 50;
const ACTION_ITEM_HEIGHT = 12;

type Props = {
    fileHistory: IpcActionReturn[IpcAction.LOAD_FILE_COMMITS]["commits"]
    openFileHistory: (path: string) => void
}
type State = {
    filter: string
};

export default class CommitContainer extends Component<Props, State> {
    updateFilter(filter: string) {
        this.setState({filter});
    }
    render() {
        const fileHistory = this.state.filter ? this.props.fileHistory.filter(item => filterCommit(this.state.filter, item)) : this.props.fileHistory;
        return (
            <div id="file-history-commits" className="pane">
                <h4>File history</h4>
                <input type="text" placeholder="Sha/message/author" title="Search/Filter" onInput={e => this.updateFilter(e.currentTarget.value)} />
                <Links.Provider value="files">
                    {!this.props.fileHistory.length ? (
                        <p>Loading...</p>
                    ) : <ScrollContainer items={fileHistory} itemHeight={ITEM_HEIGHT} renderItems={(commits, start) => {
                        let extraHeightOffset = 0;
                        return commits.map((commit, idx) => {
                            let status = "";
                            let action;
                            let height;
                            if (commit.status === Diff.DELTA.ADDED) {
                                status = " added";
                            } else if (commit.status === Diff.DELTA.RENAMED) {
                                status = " renamed";
                                action = <Link selectAction={() => this.props.openFileHistory(commit.path)} title={commit.path}><span className="renamed">RENAMED</span>&nbsp;&gt;&nbsp;{commit.path}</Link>;
                                height = `${ITEM_HEIGHT + ACTION_ITEM_HEIGHT}px`;
                            } else if (commit.status === Diff.DELTA.DELETED) {
                                status = " deleted";
                            } else if (commit.status === Diff.DELTA.MODIFIED) {
                                status = " modified";
                            }
                            const item = (
                                <li
                                    style={{position: "absolute", top: `${(start + idx) * ITEM_HEIGHT + extraHeightOffset}px`, height}}
                                    key={commit.sha}
                                >
                                    <Link onContextMenu={showFileHistoryCommitMenu} selectAction={async (_arg) => {
                                        const filePatch = await ipcGetData(IpcAction.FILE_DIFF_AT, {file: commit.path, sha: commit.sha});
                                        if (filePatch) {
                                            updateStore({
                                                currentFile: {
                                                    patch: filePatch,
                                                    commitSHA: commit.sha
                                                },
                                            });
                                        }
                                    }} title={commit.message} className="flex-column" data-sha={commit.sha}>
                                        <div className="flex-row">
                                            <span className="msg">{commit.message.substring(0, commit.message.indexOf("\n")>>>0 || 60)}</span>
                                        </div>
                                        <div className="flex-row space-between">
                                            <span className={status}>{commit.sha.substring(0,8)}</span>
                                            <span className="date">{formatTimeAgo(new Date(commit.date))}</span>
                                        </div>
                                    </Link>
                                    {action}
                                </li>
                            );

                            if (action) {
                                extraHeightOffset += ACTION_ITEM_HEIGHT;
                            }

                            return item;
                        });
                    }} />}
                </Links.Provider>
            </div>
        )
    }
}
