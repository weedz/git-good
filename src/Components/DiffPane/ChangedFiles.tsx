import { h, Component } from "preact";
import { PatchObj, CommitObj } from "src/Data/Actions";
import { openFile } from "src/Data/Renderer/store";
import { getType, DELTA } from "src/Data/Utils";

type ButtonAction = {
    label: string
    click: h.JSX.MouseEventHandler<HTMLButtonElement>
}
type Props = {
    commit?: CommitObj
    workDir?: true
    compare?: true
    patches: PatchObj[]
    actions?: ButtonAction[]
}

export default class ChangedFiles extends Component<Props, {}> {
    fileTypes = {
        added: 0,
        deleted: 0,
        modified: 0,
        renamed: 0,
        // untracked: 0,
    };
    resetCounters() {
        this.fileTypes = {
            added: 0,
            deleted: 0,
            modified: 0,
            renamed: 0,
            // untracked: 0,
        };
    }
    componentWillReceiveProps() {
        this.resetCounters();
    }
    openFile = (patch: PatchObj) => {
        this.resetCounters();
        if (this.props.commit) {
            openFile({
                sha: this.props.commit.sha,
                patch,
            });
        } else if (this.props.compare) {
            openFile({
                compare: true,
                patch,
            });
        }
        else if (this.props.workDir) {
            openFile({
                workDir: this.props.workDir,
                patch,
            });
        }
    }
    renderPatch = (patch: PatchObj) => {
        let typeCss;
        if (patch.status === DELTA.MODIFIED) {
            this.fileTypes.modified++;
            typeCss = "file-modified";
        } else if (patch.status === DELTA.DELETED) {
            this.fileTypes.deleted++;
            typeCss = "file-deleted";
        } else if (patch.status === DELTA.ADDED) {
            this.fileTypes.added++;
            typeCss = "file-added";
        } else if (patch.status === DELTA.RENAMED) {
            this.fileTypes.renamed++;
            typeCss = "file-renamed";
        } else if (patch.status === DELTA.UNTRACKED) {
            this.fileTypes.added++;
        }
        return (
            <li className="sub-tree" key={patch.actualFile.path}>
                <a href="#" onClick={_ => this.openFile(patch)}>
                    <span className={typeCss}>{getType(patch.status)}</span>&nbsp;
                    <span>{patch.actualFile.path}</span>
                </a>
                {this.props.actions && <div className="action-group">
                    {this.props.actions?.map(action => <button data-path={patch.actualFile.path} onClick={action.click}>{action.label}</button>)}
                </div>}
            </li>
        );
    }
    render() {
        const files = this.props.patches.map(this.renderPatch);
        return (
            <div className="changed-files">
                <ul className="file-types">
                    {this.fileTypes.modified > 0 && <li className="file-modified">{this.fileTypes.modified} M</li>}
                    {this.fileTypes.added > 0 && <li className="file-added">{this.fileTypes.added} A</li>}
                    {this.fileTypes.deleted > 0 && <li className="file-deleted">{this.fileTypes.deleted} D</li>}
                    {this.fileTypes.renamed > 0 && <li className="file-renamed">{this.fileTypes.renamed} R</li>}
                </ul>
                <ul className="diff-view block-list">
                    {files}
                </ul>
            </div>
        );
    }
}
