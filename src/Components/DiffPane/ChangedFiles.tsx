import { h, Component } from "preact";
import { PatchObj, CommitObj } from "../../Data/Actions";
import { openFile, resolveConflict } from "../../Data/Renderer/store";
import { getType, DELTA } from "../../Data/Utils";
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
        if (patch.status === DELTA.MODIFIED) {
            deltas.modified++;
        } else if (patch.status === DELTA.DELETED) {
            deltas.deleted++;
        } else if (patch.status === DELTA.ADDED) {
            deltas.added++;
        } else if (patch.status === DELTA.RENAMED) {
            deltas.renamed++;
        } else if (patch.status === DELTA.UNTRACKED) {
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
        if (patch.status === DELTA.MODIFIED) {
            typeCss = "file-modified";
        } else if (patch.status === DELTA.DELETED) {
            typeCss = "file-deleted";
        } else if (patch.status === DELTA.ADDED) {
            typeCss = "file-added";
        } else if (patch.status === DELTA.RENAMED) {
            typeCss = "file-renamed";
        } else if (patch.status === DELTA.UNTRACKED) {
            typeCss = "file-untracked";
        }
        if (patch.status === DELTA.CONFLICTED) {
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
        return (
            <li onContextMenu={this.fileContextMenu} className="sub-tree" key={patch.actualFile.path} data-path={patch.actualFile.path}>
                <Link className={typeCss} linkData={patch} selectAction={this.openFile}>
                    <span className="status">{getType(patch.status)}</span>&nbsp;
                    <span>{patch.actualFile.path}</span>
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
