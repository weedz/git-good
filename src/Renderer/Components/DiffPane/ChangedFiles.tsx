import { Component, type h } from "preact";
import { type CommitObj, type PatchObj } from "../../../Common/Actions.js";
import { DiffDelta } from "../../../Common/Utils.js";
import { LinkTypes } from "../../../Common/WindowEventTypes.js";
import { openFile, resolveConflict } from "../../Data/index.js";
import { ensureTreePath, toggleTreeItem, type Tree } from "../../Data/Tree.js";
import Link from "../Link.js";
import { Links } from "../LinkContainer.js";
import { showFileMenu } from "./FileMenu.js";
import { getFileCssClass, getType } from "./utility.js";

interface ButtonAction {
    label: string;
    click: h.JSX.MouseEventHandler<HTMLButtonElement>;
}
type Props =
    & ({
        workDir: true;
        type: "staged" | "unstaged";
    } | {
        commit: CommitObj;
    } | {
        compare: true;
    })
    & {
        patches: PatchObj[];
        actions?: ButtonAction[];
    };

interface State {
    fileFilter?: string;
    renderType: RenderType;
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
    for (let i = 0, len = patches.length; i < len; ++i) {
        const patch = patches[i];
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

function checkActions(patch: PatchObj, actions: ButtonAction[]): ButtonAction[] {
    if (patch.status === DiffDelta.CONFLICTED) {
        return [
            {
                click: (e) => {
                    const path = e.currentTarget.dataset.path;
                    if (path) {
                        resolveConflict(path);
                    }
                },
                label: "Resolve",
            },
        ];
    }
    return actions;
}

function renderPaths(
    patches: PatchObj[],
    actions: ButtonAction[],
    contextMenu: (e: h.JSX.TargetedMouseEvent<HTMLLIElement>) => void,
    selectAction: (data: Link<PatchObj>) => void,
) {
    const paths = [];
    for (let i = 0, len = patches.length; i < len; ++i) {
        const patch = patches[i];
        const typeCss = getFileCssClass(patch.status);

        const lastSlash = patch.actualFile.path.lastIndexOf("/") + 1;
        const path = patch.actualFile.path.substring(0, lastSlash);
        const basename = patch.actualFile.path.substring(path.length);

        paths.push(
            <li onContextMenu={contextMenu} key={patch.actualFile.path} data-path={patch.actualFile.path}>
                <Link class={`${typeCss} flex-row`} linkData={patch} selectAction={selectAction}>
                    <span class="status">{getType(patch.status)}</span>
                    &nbsp;
                    <div title={patch.actualFile.path} style="min-width: 0;display:flex">
                        <span class="file-path truncate">{path}</span>
                        <span class="basename truncate">{basename}</span>
                    </div>
                </Link>
                <div class="action-group">
                    {checkActions(patch, actions).map(action => (
                        <button key={patch.actualFile.path} data-path={patch.actualFile.path} onClick={action.click}>{action.label}</button>
                    ))}
                </div>
            </li>,
        );
    }
    return paths;
}

function renderTree(
    tree: Tree<PatchObj>,
    actions: ButtonAction[],
    contextMenu: (e: h.JSX.TargetedMouseEvent<HTMLLIElement>) => void,
    selectAction: (data: Link<PatchObj>) => void,
    indent = 0,
) {
    const items = [];
    // Sort directories before files
    const sortedChildren = Array.from(tree.children.entries()).sort(([_, a], [_b, b]) => a.children.size && !b.children.size ? -1 : 0);
    for (const { 0: path, 1: child } of sortedChildren) {
        if (child.item) {
            const patch = child.item;
            const typeCss = getFileCssClass(patch.status);
            items.push(
                <li onContextMenu={contextMenu} key={patch.actualFile.path} data-path={patch.actualFile.path}>
                    <Link class={`${typeCss} flex-row`} linkData={patch} selectAction={selectAction}>
                        <span class="status">{getType(patch.status)}</span>
                        <div title={patch.actualFile.path} style="display:flex">
                            <span style={{ textIndent: "0.5em" }}>{path}</span>
                        </div>
                    </Link>
                    <div class="action-group">
                        {checkActions(patch, actions).map(action => (
                            <button key={patch.actualFile.path} data-path={patch.actualFile.path} onClick={action.click}>{action.label}</button>
                        ))}
                    </div>
                </li>,
            );
        } else {
            items.push(
                <li class="sub-tree" key={path}>
                    <a href="#" onClick={toggleTreeItem}>
                        <span style={{ textIndent: "0" }}>{path}</span>
                    </a>
                    {renderTree(child, actions, contextMenu, selectAction, indent + 1)}
                </li>,
            );
        }
    }
    return (
        <ul style={{ textIndent: `${indent}em` }} class="tree-list block-list">
            {items}
        </ul>
    );
}

function renderTreeFromPatches(
    patches: PatchObj[],
    actions: ButtonAction[],
    contextMenu: (e: h.JSX.TargetedMouseEvent<HTMLLIElement>) => void,
    selectAction: (data: Link<PatchObj>) => void,
) {
    const tree = pathsToTree(patches);

    return renderTree(tree, actions, contextMenu, selectAction);
}
function pathsToTree(paths: PatchObj[]): Tree<PatchObj> {
    const tree: Tree<PatchObj> = {
        children: new Map(),
    };
    for (let i = 0, len = paths.length; i < len; ++i) {
        const segments = paths[i].actualFile.path.split("/");

        const leaf = ensureTreePath(tree, segments);
        leaf.item = paths[i];
    }

    return tree;
}

export default class ChangedFiles extends Component<Props, State> {
    state: State = {
        renderType: RenderType.PATH,
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
                type: this.props.type,
            });
        }
    };
    filterFiles = (e: h.JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
        this.setState({
            fileFilter: e.currentTarget.value.toLocaleLowerCase(),
        });
    };

    fileContextMenu = (e: h.JSX.TargetedMouseEvent<HTMLLIElement>) => {
        showFileMenu(e, "commit" in this.props ? this.props.commit.sha : undefined);
    };
    render() {
        const fileFilter = this.state.fileFilter;
        const patches = fileFilter ? this.props.patches.filter(patch => patch.actualFile.path.toLocaleLowerCase().includes(fileFilter)) : this.props.patches;

        const deltas = calcDeltas(patches);

        const files = this.state.renderType === RenderType.PATH
            ? renderPaths(patches.slice(0, 1000), this.props.actions || [], this.fileContextMenu, this.openFile)
            : renderTreeFromPatches(patches.slice(0, 1000), this.props.actions || [], this.fileContextMenu, this.openFile);

        return (
            <div class="changed-files inset">
                <div class="flex-row btn-group" style="margin: auto">
                    <button
                        class={this.state.renderType === RenderType.PATH ? "selected" : undefined}
                        onClick={() => this.setState({ renderType: RenderType.PATH })}
                    >
                        Path
                    </button>
                    <button
                        class={this.state.renderType === RenderType.TREE ? "selected" : undefined}
                        onClick={() => this.setState({ renderType: RenderType.TREE })}
                    >
                        Tree
                    </button>
                    {this.state.renderType === RenderType.TREE && (
                        <span
                            style="align-self:center;position:absolute;right:0;cursor:pointer;user-select:none"
                            onClick={(e) => {
                                const fileContainer = e.currentTarget.closest(".changed-files")?.querySelector(".diff-view.block-list");
                                if (fileContainer) {
                                    for (const list of Array.from(fileContainer.querySelectorAll("li.sub-tree"))) {
                                        list.classList.add("open");
                                    }
                                }
                            }}
                        >
                            Expand all
                        </span>
                    )}
                </div>
                <ul class="file-types">
                    {deltas.modified > 0 && <li class="modified">{deltas.modified} modified</li>}
                    {deltas.added > 0 && <li class="added">{deltas.added} added</li>}
                    {deltas.deleted > 0 && <li class="deleted">{deltas.deleted} deleted</li>}
                    {deltas.renamed > 0 && <li class="renamed">{deltas.renamed} renamed</li>}
                </ul>
                <Links.Provider value={LinkTypes.FILES}>
                    <ul class="diff-view block-list">
                        {files}
                    </ul>
                </Links.Provider>
                <input type="text" onKeyUp={this.filterFiles} placeholder="Search file..." value={this.state.fileFilter} />
            </div>
        );
    }
}
