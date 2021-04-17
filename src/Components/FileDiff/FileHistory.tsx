import { Diff } from "nodegit";
import { h } from "preact";
import { PureComponent } from "preact/compat";
import { ipcGetData } from "src/Data/Renderer/IPC";
import { IpcActionReturn, IpcAction } from "src/Data/Actions";
import { updateStore } from "src/Data/Renderer/store";
import { formatTimeAgo } from "src/Data/Utils";
import ScrollContainer from "../ScrollContainer";
import Link from "../Link";

const ITEM_HEIGHT = 50;
const ACTION_ITEM_HEIGHT = 12;

type Props = {
    fileHistory: IpcActionReturn[IpcAction.LOAD_FILE_COMMITS]["commits"]
    openFileHistory: (path: string) => void
}

// eslint-disable-next-line react/prefer-stateless-function
export default class CommitContainer extends PureComponent<Props> {
    render() {
        return (
            <div id="file-history-commits" className="pane">
                <h4>File history</h4>
                {!this.props.fileHistory.length ? (
                    <p>Loading...</p>
                ) : <ScrollContainer items={this.props.fileHistory} itemHeight={ITEM_HEIGHT} renderItems={(commits, start) => {
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
                                <Link selectAction={async (_arg) => {
                                    const filePatch = await ipcGetData(IpcAction.FILE_DIFF_AT, {file: commit.path, sha: commit.sha});
                                    if (filePatch) {
                                        updateStore({
                                            currentFile: {
                                                patch: filePatch,
                                                commitSHA: commit.sha
                                            },
                                        });
                                    }
                                }} title={commit.message} className="flex-column">
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
            </div>
        )
    }
}
