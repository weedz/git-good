import { Component } from "preact";
import { IpcAction, type LoadFileCommitsReturn } from "../../../Common/Actions.js";
import { DiffDelta, formatTimeAgo } from "../../../Common/Utils.js";
import { LinkTypes } from "../../../Common/WindowEventTypes.js";
import { ipcGetData } from "../../Data/IPC.js";
import { store } from "../../Data/store.js";
import { filterCommit } from "../../Data/Utility.js";
import Link from "../Link.js";
import { Links } from "../LinkContainer.js";
import ScrollContainer from "../ScrollContainer.js";
import { showFileHistoryCommitMenu } from "./FileHistoryMenu.js";

const ITEM_HEIGHT = 50;
const ACTION_ITEM_HEIGHT = 12;

type Props = {
    fileHistory: LoadFileCommitsReturn["commits"];
    openFileHistory: (path: string) => void;
};
type State = {
    filter: string;
};

export default class CommitContainer extends Component<Props, State> {
    updateFilter(filter: string) {
        this.setState({ filter });
    }
    render() {
        const fileHistory = this.state.filter ? this.props.fileHistory.filter(item => filterCommit(this.state.filter, item)) : this.props.fileHistory;
        return (
            <div id="file-history-commits" class="pane">
                <h4>File history</h4>
                <input type="text" placeholder="Sha/message/author" title="Search/Filter" onInput={e => this.updateFilter(e.currentTarget.value)} />
                <Links.Provider value={LinkTypes.FILES}>
                    {!this.props.fileHistory.length
                        ? <p>Loading...</p>
                        : (
                            <ScrollContainer
                                items={fileHistory}
                                itemHeight={ITEM_HEIGHT}
                                renderItems={(commits, start) => {
                                    let extraHeightOffset = 0;
                                    return commits.map((commit, idx) => {
                                        let status = "";
                                        let action;
                                        let height;
                                        if (commit.status === DiffDelta.ADDED) {
                                            status = " added";
                                        } else if (commit.status === DiffDelta.RENAMED) {
                                            status = " renamed";
                                            action = (
                                                <Link selectAction={() => this.props.openFileHistory(commit.path)} title={commit.path}>
                                                    <span class="renamed">RENAMED</span>&nbsp;&gt;&nbsp;{commit.path}
                                                </Link>
                                            );
                                            height = `${ITEM_HEIGHT + ACTION_ITEM_HEIGHT}px`;
                                        } else if (commit.status === DiffDelta.DELETED) {
                                            status = " deleted";
                                        } else if (commit.status === DiffDelta.MODIFIED) {
                                            status = " modified";
                                        }
                                        const item = (
                                            <li
                                                style={{ position: "absolute", top: `${(start + idx) * ITEM_HEIGHT + extraHeightOffset}px`, height }}
                                                key={commit.sha}
                                            >
                                                <Link
                                                    onContextMenu={showFileHistoryCommitMenu}
                                                    selectAction={async (_arg) => {
                                                        const filePatch = await ipcGetData(IpcAction.FILE_DIFF_AT, { file: commit.path, sha: commit.sha });
                                                        if (filePatch) {
                                                            store.updateStore("currentFile", {
                                                                patch: filePatch,
                                                                commitSHA: commit.sha,
                                                            });
                                                        }
                                                    }}
                                                    title={commit.message}
                                                    class="flex-column"
                                                    data-sha={commit.sha}
                                                    data-path={commit.path}
                                                >
                                                    <div class="flex-row">
                                                        <span class="msg">{commit.message.substring(0, commit.message.indexOf("\n") >>> 0 || 60)}</span>
                                                    </div>
                                                    <div class="flex-row space-between">
                                                        <span class={status}>{commit.sha.substring(0, 8)}</span>
                                                        <span class="date">{formatTimeAgo(new Date(commit.date))}</span>
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
                                }}
                            />
                        )}
                </Links.Provider>
            </div>
        );
    }
}
