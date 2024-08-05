import { type h } from "preact";
import type { BranchObj, BranchesObj } from "../../../Common/Actions.js";
import { ensureTreePath, toggleTreeItem, type Tree } from "../../Data/Tree.js";
import { store } from "../../Data/store.js";
import Link from "../Link.js";

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
        store.updateStore("selectedBranch", c.props.linkData);
    }
}

export function RenderBranchTree(props: {
    branches: Tree<BranchObj>
    contextMenu?: ((event: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) => void) | undefined
    dblClick?: ((event: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) => void) | undefined
    indent: number
}) {
    const items = [];
    // Sort the children by size
    const sortedChildren = Array.from(props.branches.children.entries()).sort(([_, a], [_b, b]) => a.children.size && !b.children.size ? -1 : 0);
    for (let i = 0, len = sortedChildren.length; i < len; ++i) {
        const { 0: item, 1: child } = sortedChildren[i];
        if (child.item) {
            items.push(
                <li key={child.item.headSHA}>
                    <Link style={{ textIndent: `${props.indent}em` }} linkId={child.item.name} selectAction={selectAction} onDblClick={props.dblClick} onContextMenu={props.contextMenu} data-ref={child.item.name} data-remote={child.item.remote} linkData={child.item.name}>
                        {item}&nbsp;{branchesAheadBehind(child.item)}
                    </Link>
                </li>
            );
        } else {
            items.push(
                <li class="sub-tree" key={item}>
                    <a style={{ textIndent: `${props.indent}em` }} href="#" onClick={toggleTreeItem}>{item}</a>
                    <RenderBranchTree branches={child} contextMenu={props.contextMenu} dblClick={props.dblClick} indent={props.indent + 1} />
                </li>
            );
        }
    }
    return (
        <ul class="tree-list block-list">
            {items}
        </ul>
    );
}

export function RenderRemotes(props: {
    branches: Tree<BranchObj>
    remoteContextMenu: (event: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) => void
    contextMenu: (event: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) => void
}) {
    const items = [];
    for (const { 0: item, 1: child } of props.branches.children.entries()) {
        items.push(
            <li class="sub-tree" key={item}>
                <a style={{ textIndent: `1em` }} href="#" onClick={toggleTreeItem} onContextMenu={props.remoteContextMenu} data-remote={item}>{item}</a>
                <RenderBranchTree branches={child} contextMenu={props.contextMenu} indent={2} />
            </li>
        );
    }
    return (
        <ul class="tree-list block-list">
            {items}
        </ul>
    )
}

function toBranchTree(branches: BranchObj[]) {
    const tree: Tree<BranchObj> = {
        children: new Map()
    };
    const sortedBranches = branches.sort((a, b) => a.normalizedName.localeCompare(b.normalizedName));
    for (let i = 0, len = sortedBranches.length; i < len; ++i) {
        const segments = sortedBranches[i].normalizedName.split("/");

        const leaf = ensureTreePath(tree, segments);
        leaf.item = sortedBranches[i];
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

export function filterBranches(branches: BranchesObj, filter: (value: BranchObj) => boolean) {
    return {
        remote: branches.remote.filter(filter),
        local: branches.local.filter(filter),
        tags: branches.tags.filter(filter),
    };
}
