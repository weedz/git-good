import { h } from "preact";
import { PureComponent } from "preact/compat";
import { BranchObj, BranchesObj } from "../../../Common/Actions";
import { ensureTreePath, toggleTreeItem, Tree } from "../../../Common/Tree";
import { updateStore } from "../../Data/store";
import Link from "../Link";

export function branchesAheadBehind(ref: BranchObj) {
    const aheadbehind = [];
    if (ref.status) {
        if (ref.status.ahead) {
            aheadbehind.push(<span>{ref.status.ahead}&uarr;</span>);
        }
        if (ref.status.behind) {
            aheadbehind.push(<span>{ref.status.behind}&darr;</span>);
        }
    }
    return aheadbehind;
}

function selectAction(c: Link<string>) {
    if (c.props.linkData) {
        updateStore({selectedBranch: {branch: c.props.linkData}});
    }
}

// eslint-disable-next-line react/prefer-stateless-function
export class RenderBranchTree extends PureComponent<{
    branches: Tree<BranchObj>
    contextMenu?: ((event: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) => void) | undefined
    dblClick?: ((event: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) => void) | undefined
    indent: number
}> {
    render() {
        const items = [];
        for (const [item, child] of this.props.branches.children.entries()) {
            if (child.item) {
                items.push(
                    <li key={child.item.headSHA}>
                        <Link style={{textIndent: `${this.props.indent}em`}} linkId={child.item.name} selectAction={selectAction} onDblClick={this.props.dblClick} onContextMenu={this.props.contextMenu} data-ref={child.item.name} data-remote={child.item.remote} linkData={child.item.name}>
                            {item}&nbsp;{branchesAheadBehind(child.item)}
                        </Link>
                    </li>
                );
            } else {
                items.push(
                    <li className="sub-tree" key={item}>
                        <a style={{textIndent: `${this.props.indent}em`}} href="#" onClick={toggleTreeItem}>{item}</a>
                        <RenderBranchTree branches={child} contextMenu={this.props.contextMenu} dblClick={this.props.dblClick} indent={this.props.indent + 1} />
                    </li>
                );
            }
        }
        return (
            <ul className="tree-list block-list">
                {items}
            </ul>
        );
    }
}

// eslint-disable-next-line react/prefer-stateless-function
export class RenderRemotes extends PureComponent<{
    branches: Tree<BranchObj>
    remoteContextMenu: (event: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) => void
    contextMenu: (event: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) => void
}> {
    render() {
        const items = [];
        for (const [item, child] of this.props.branches.children.entries()) {
            items.push(
                <li className="sub-tree" key={item}>
                    <a style={{textIndent: `1em`}} href="#" onClick={toggleTreeItem} onContextMenu={this.props.remoteContextMenu} data-remote={item}>{item}</a>
                    <RenderBranchTree branches={child} contextMenu={this.props.contextMenu} indent={2} />
                </li>
            );
        }
        return (
            <ul className="tree-list block-list">
                {items}
            </ul>
        )
    }
}

function toBranchTree(branches: BranchObj[]) {
    const tree: Tree<BranchObj> = {
        children: new Map()
    };
    for (const branch of branches.sort((a,b) => a.normalizedName.localeCompare(b.normalizedName))) {
        const segments = branch.normalizedName.split("/");

        const leaf = ensureTreePath(tree, segments);
        leaf.item = branch;
    }

    return tree;
}

export function getBranchTree(branches: BranchesObj) {
    return {
        local: toBranchTree(branches.local),
        remote: toBranchTree(branches.remote),
        tags: toBranchTree(branches.tags),
    };
}

export function filterBranches(branches: BranchesObj, filter: (value: BranchObj) => boolean)
{
    return {
        remote: branches.remote.filter(filter),
        local: branches.local.filter(filter),
        tags: branches.tags.filter(filter),
    };
}
