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
    openFile = (patch: PatchObj) => {
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
            typeCss = "file-modified";
        } else if (patch.status === DELTA.DELETED) {
            typeCss = "file-deleted";
        } else if (patch.status === DELTA.ADDED) {
            typeCss = "file-added";
        } else if (patch.status === DELTA.RENAMED) {
            typeCss = "file-renamed";
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
        return (
            <div>
                <ul className="diff-view block-list">
                    {this.props.patches.map(this.renderPatch)}
                </ul>
            </div>
        );
    }
}
