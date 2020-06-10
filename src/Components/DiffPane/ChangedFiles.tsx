import { h, Component } from "preact";
import { PatchObj, CommitObj } from "src/Data/Actions";
import { openFile } from "src/Data/Renderer/store";

type ButtonAction = {
    label: string
    click: h.JSX.MouseEventHandler<HTMLButtonElement>
}
type Props = {
    commit?: CommitObj
    workDir?: boolean
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
        } else if (this.props.workDir) {
            openFile({
                workDir: this.props.workDir,
                patch,
            });
        }
    }
    renderPatch = (patch: PatchObj) => {
        let typeCss;
        if (patch.type === "M") {
            typeCss = "file-modified";
        } else if (patch.type === "D") {
            typeCss = "file-deleted";
        } else if (patch.type === "A") {
            typeCss = "file-added";
        } else if (patch.type === "R") {
            typeCss = "file-renamed";
        }
        return (
            <li class="sub-tree" key={patch.actualFile.path}>
                <a href="#" onClick={_ => this.openFile(patch)}>
                    <span className={typeCss}>{patch.type}</span>&nbsp;
                    <span>{patch.actualFile.path}</span>
                </a>
                {this.props.actions && <div class="action-group">
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
