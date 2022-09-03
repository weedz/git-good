import { h, Component } from "preact";
import { PatchObj, CommitObj } from "../../../Common/Actions";
import { openFile, resolveConflict } from "../../Data/store";
import { DiffDelta, getType } from "../../../Common/Utils";
import Link from "../Link";
import { Links } from "../LinkContainer";
import { showFileMenu } from "./FileMenu";
import { ensureTreePath, toggleTreeItem, Tree } from "../../../Common/Tree";

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

interface State {
    fileFilter?: string
    renderType: RenderType
}

const enum RenderType {
    PATH = 0,
    TREE,
}

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

function getFileCssClass(status: DiffDelta) {
    if (status === DiffDelta.MODIFIED) {
        return "file-modified";
    } else if (status === DiffDelta.DELETED) {
        return "file-deleted";
    } else if (status === DiffDelta.ADDED) {
        return "file-added";
    } else if (status === DiffDelta.RENAMED) {
        return "file-renamed";
    } else if (status === DiffDelta.UNTRACKED) {
        return "file-untracked";
    } else if (status === DiffDelta.CONFLICTED) {
        return "file-conflicted";
    }
}

function renderPaths(patches: PatchObj[], actions: ButtonAction[], contextMenu: (e: h.JSX.TargetedMouseEvent<HTMLLIElement>) => void, selectAction: (data: Link<PatchObj>) => void) {
    const paths = [];
    for (const patch of patches) {
        const typeCss = getFileCssClass(patch.status);
        if (patch.status === DiffDelta.CONFLICTED) {
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

        paths.push(
            <li onContextMenu={contextMenu} key={patch.actualFile.path} data-path={patch.actualFile.path}>
                <Link className={`${typeCss} flex-row`} linkData={patch} selectAction={selectAction}>
                    <span className="status">{getType(patch.status)}</span>&nbsp;
                    <div title={patch.actualFile.path} style="min-width: 0;display:flex">
                        <span className="file-path truncate">{path}</span>
                        <span className="basename truncate">{basename}</span>
                    </div>
                </Link>
                <div className="action-group">
                    {actions.map(action => <button key={patch.actualFile.path} data-path={patch.actualFile.path} onClick={action.click}>{action.label}</button>)}
                </div>
            </li>
        );
    }
    return paths;
}

function renderTree(tree: Tree<PatchObj>, actions: ButtonAction[], contextMenu: (e: h.JSX.TargetedMouseEvent<HTMLLIElement>) => void, selectAction: (data: Link<PatchObj>) => void, indent = 0) {
    const items = [];
    // Sort directories before files
    const sortedChildren = Array.from(tree.children.entries()).sort( ([_, child]) => child.children.size ? -1 : 0);
    for (const [item, child] of sortedChildren) {
        if (child.item) {
            const patch = child.item;
            const typeCss = getFileCssClass(patch.status);
            let currentActions = actions;
            if (patch.status === DiffDelta.CONFLICTED) {
                currentActions = [
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
            items.push(
                <li onContextMenu={contextMenu} key={patch.actualFile.path} data-path={patch.actualFile.path}>
                    <Link className={`${typeCss} flex-row`} linkData={patch} selectAction={selectAction}>
                        <span className="status">{getType(patch.status)}</span>
                        <div title={patch.actualFile.path} style="display:flex">
                            <span style={{textIndent: "0.5em"}}>{item}</span>
                        </div>
                    </Link>
                    <div className="action-group">
                        {currentActions.map(action => <button key={patch.actualFile.path} data-path={patch.actualFile.path} onClick={action.click}>{action.label}</button>)}
                    </div>
                </li>
            );
        } else {
            items.push(
                <li className="sub-tree" key={item}>
                    <a href="#" onClick={toggleTreeItem}><span style={{textIndent: "0"}}>{item}</span></a>
                    {renderTree(child, actions, contextMenu, selectAction, indent + 1)}
                </li>
            );
        }
    }
    return (
        <ul style={{textIndent: `${indent}em`}} className="tree-list block-list">
            {items}
        </ul>
    );
}

function renderTreeFromPatches(patches: PatchObj[], actions: ButtonAction[], contextMenu: (e: h.JSX.TargetedMouseEvent<HTMLLIElement>) => void, selectAction: (data: Link<PatchObj>) => void) {
    const tree = pathsToTree(patches);

    return renderTree(tree, actions, contextMenu, selectAction);
}
function pathsToTree(paths: PatchObj[]): Tree<PatchObj> {
    const tree: Tree<PatchObj> = {
        children: new Map()
    };
    for (const path of paths) {
        const segments = path.actualFile.path.split("/");

        const leaf = ensureTreePath(tree, segments);
        leaf.item = path;
    }

    return tree;
}

export default class ChangedFiles extends Component<Props, State> {
    state: State = {
        renderType: RenderType.PATH
    };

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

    fileContextMenu = (e: h.JSX.TargetedMouseEvent<HTMLLIElement>) => {
        showFileMenu(e, "commit" in this.props ? this.props.commit.sha : undefined);
    }
    render() {
        const fileFilter = this.state.fileFilter;
        const patches = fileFilter ? this.props.patches.filter(patch => patch.actualFile.path.toLocaleLowerCase().includes(fileFilter)) : this.props.patches;

        const deltas = calcDeltas(patches);

        const files = this.state.renderType === RenderType.PATH
            ? renderPaths(patches.slice(0, 1000), this.props.actions || [], this.fileContextMenu, this.openFile)
            : renderTreeFromPatches(patches.slice(0, 1000), this.props.actions || [], this.fileContextMenu, this.openFile);

        return (
            <div className="changed-files inset">
                <div className="flex-row btn-group" style="margin: auto">
                    <button className={this.state.renderType === RenderType.PATH ? "selected" : undefined} onClick={() => this.setState({renderType: RenderType.PATH})}>Path</button>
                    <button className={this.state.renderType === RenderType.TREE ? "selected" : undefined} onClick={() => this.setState({renderType: RenderType.TREE})}>Tree</button>
                </div>
                <input type="text" onKeyUp={this.filterFiles} placeholder="Search file..." value={this.state.fileFilter} />
                <ul className="file-types">
                    {deltas.modified > 0 && <li className="modified">{deltas.modified} modified</li>}
                    {deltas.added > 0 && <li className="added">{deltas.added} added</li>}
                    {deltas.deleted > 0 && <li className="deleted">{deltas.deleted} deleted</li>}
                    {deltas.renamed > 0 && <li className="renamed">{deltas.renamed} renamed</li>}
                </ul>
                <Links.Provider value="files">
                    <ul className="diff-view block-list">
                        {files}
                    </ul>
                </Links.Provider>
            </div>
        );
    }
}
