import { h, Component } from "preact";
import { PatchObj, CommitObj } from "src/Data/Actions";
import { openFile } from "src/Data/Renderer/store";
import { getType, DELTA } from "src/Data/Utils";
import Link from "../Link";
import { Links } from "../LinkContainer";
import { showFileMenu } from "./FileMenu";

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

export default class ChangedFiles extends Component<Props, {fileFilter?: string}> {
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
    openFile = (data: Link<PatchObj>) => {
        this.resetCounters();
        const patch = data.props.linkData as unknown as PatchObj;
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
    filterFiles = (e: h.JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
        this.resetCounters();
        this.setState({
            fileFilter: e.currentTarget.value.toLocaleLowerCase()
        });
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
            <li onContextMenu={showFileMenu} className="sub-tree" key={patch.actualFile.path} data-path={patch.actualFile.path}>
                <Link linkData={patch} selectAction={this.openFile}>
                    <span className={typeCss}>{getType(patch.status)}</span>&nbsp;
                    <span>{patch.actualFile.path}</span>
                </Link>
                {this.props.actions && <div className="action-group">
                    {this.props.actions?.map(action => <button data-path={patch.actualFile.path} onClick={action.click}>{action.label}</button>)}
                </div>}
            </li>
        );
    }
    render() {
        const fileFilter = this.state.fileFilter;
        const patches = fileFilter ? this.props.patches.filter(patch => patch.actualFile.path.toLocaleLowerCase().includes(fileFilter)) : this.props.patches;

        const files = patches.slice(0, 1000).map(this.renderPatch);

        return (
            <div className="changed-files">
                {files.length > 0 && <input type="text" onKeyUp={this.filterFiles} placeholder="Search file..." value={this.state.fileFilter} />}
                <ul className="file-types">
                    {this.fileTypes.modified > 0 && <li className="file-modified">{this.fileTypes.modified} modified</li>}
                    {this.fileTypes.added > 0 && <li className="file-added">{this.fileTypes.added} added</li>}
                    {this.fileTypes.deleted > 0 && <li className="file-deleted">{this.fileTypes.deleted} deleted</li>}
                    {this.fileTypes.renamed > 0 && <li className="file-renamed">{this.fileTypes.renamed} renamed</li>}
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
