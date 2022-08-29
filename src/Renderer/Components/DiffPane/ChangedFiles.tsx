import { h, Component } from "preact";
import { PatchObj, CommitObj } from "../../../Common/Actions";
import { openFile, resolveConflict } from "../../Data/store";
import { DiffDelta, getType } from "../../../Common/Utils";
import Link from "../Link";
import { Links } from "../LinkContainer";
import { showFileMenu } from "./FileMenu";

interface ButtonAction {
    label: string
    click: h.JSX.MouseEventHandler<HTMLButtonElement>
}
type Props = ({
    workDir: true
    type: "staged" | "unstaged"
} | {
    commit: CommitObj
} | {
    compare: true
}) & {
    patches: PatchObj[]
    actions?: ButtonAction[]
};

function calcDeltas(patches: Props["patches"]) {
    const deltas = {
        added: 0,
        deleted: 0,
        modified: 0,
        renamed: 0,
        // untracked: 0,
    };
    for (const patch of patches.slice(0, 1000)) {
        if (patch.status === DiffDelta.MODIFIED) {
            deltas.modified++;
        } else if (patch.status === DiffDelta.DELETED) {
            deltas.deleted++;
        } else if (patch.status === DiffDelta.ADDED) {
            deltas.added++;
        } else if (patch.status === DiffDelta.RENAMED) {
            deltas.renamed++;
        } else if (patch.status === DiffDelta.UNTRACKED) {
            deltas.added++;
        }
    }
    return deltas;
}

export default class ChangedFiles extends Component<Props, {fileFilter?: string}> {
    openFile = (data: Link<PatchObj>) => {
        const patch = data.props.linkData as unknown as PatchObj;
        if ("commit" in this.props) {
            openFile({
                sha: this.props.commit.sha,
                patch,
            });
        } else if ("compare" in this.props) {
            openFile({
                compare: true,
                patch,
            });
        } else if (this.props.workDir) {
            openFile({
                workDir: this.props.workDir,
                patch,
                type: this.props.type
            });
        }
    }
    filterFiles = (e: h.JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
        this.setState({
            fileFilter: e.currentTarget.value.toLocaleLowerCase()
        });
    }
    renderPatch = (patch: PatchObj) => {
        let actions = this.props.actions || [];
        let typeCss;
        if (patch.status === DiffDelta.MODIFIED) {
            typeCss = "file-modified";
        } else if (patch.status === DiffDelta.DELETED) {
            typeCss = "file-deleted";
        } else if (patch.status === DiffDelta.ADDED) {
            typeCss = "file-added";
        } else if (patch.status === DiffDelta.RENAMED) {
            typeCss = "file-renamed";
        } else if (patch.status === DiffDelta.UNTRACKED) {
            typeCss = "file-untracked";
        }
        if (patch.status === DiffDelta.CONFLICTED) {
            typeCss = "file-conflicted";
            actions = [
                {
                    click: (e) => {
                        const path = e.currentTarget.dataset.path;
                        if (path) {
                            resolveConflict(path);
                        }
                    },
                    label: "Resolve"
                }
            ];
        }

        const lastSlash = patch.actualFile.path.lastIndexOf("/") + 1;
        const path = patch.actualFile.path.substring(0, lastSlash);
        const basename = patch.actualFile.path.substring(path.length);

        return (
            <li onContextMenu={this.fileContextMenu} key={patch.actualFile.path} data-path={patch.actualFile.path}>
                <Link className={`${typeCss} flex-row`} linkData={patch} selectAction={this.openFile}>
                    <span className="status">{getType(patch.status)}</span>&nbsp;
                    <div title={patch.actualFile.path} style="min-width: 0;display:flex">
                        <span className="file-path">{path}</span>
                        <span className="basename">{basename}</span>
                    </div>
                </Link>
                <div className="action-group">
                    {actions.map(action => <button key={patch.actualFile.path} data-path={patch.actualFile.path} onClick={action.click}>{action.label}</button>)}
                </div>
            </li>
        );
    }
    fileContextMenu = (e: h.JSX.TargetedMouseEvent<HTMLLIElement>) => {
        showFileMenu(e, "commit" in this.props ? this.props.commit.sha : undefined);
    }
    render() {
        const fileFilter = this.state.fileFilter;
        const patches = fileFilter ? this.props.patches.filter(patch => patch.actualFile.path.toLocaleLowerCase().includes(fileFilter)) : this.props.patches;

        const files = patches.slice(0, 1000).map(this.renderPatch);

        const deltas = calcDeltas(patches);

        return (
            <div className="changed-files">
                <input type="text" onKeyUp={this.filterFiles} placeholder="Search file..." value={this.state.fileFilter} />
                <ul className="file-types">
                    {deltas.modified > 0 && <li className="modified">{deltas.modified} modified</li>}
                    {deltas.added > 0 && <li className="added">{deltas.added} added</li>}
                    {deltas.deleted > 0 && <li className="deleted">{deltas.deleted} deleted</li>}
                    {deltas.renamed > 0 && <li className="renamed">{deltas.renamed} renamed</li>}
                </ul>
                <Links.Provider value="files">
                    <ul className="diff-view block-list inset">
                        {files}
                    </ul>
                </Links.Provider>
            </div>
        );
    }
}
