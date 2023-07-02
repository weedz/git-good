import { h } from "preact";
import type { BranchObj, BranchesObj } from "../../../Common/Actions";
import { ensureTreePath, toggleTreeItem, type Tree } from "../../Data/Tree";
import { store } from "../../Data/store";
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
    const sortedChildren = Array.from(props.branches.children.entries()).sort( ([_, a], [_b, b]) => a.children.size && !b.children.size ? -1 : 0);
    for (const [item, child] of sortedChildren) {
        if (child.item) {
            items.push(
                <li key={child.item.headSHA}>
                    <Link style={{textIndent: `${props.indent}em`}} linkId={child.item.name} selectAction={selectAction} onDblClick={props.dblClick} onContextMenu={props.contextMenu} data-ref={child.item.name} data-remote={child.item.remote} linkData={child.item.name}>
                        {item}&nbsp;{branchesAheadBehind(child.item)}
                    </Link>
                </li>
            );
        } else {
            items.push(
                <li class="sub-tree" key={item}>
                    <a style={{textIndent: `${props.indent}em`}} href="#" onClick={toggleTreeItem}>{item}</a>
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
    for (const [item, child] of props.branches.children.entries()) {
        items.push(
            <li class="sub-tree" key={item}>
                <a style={{textIndent: `1em`}} href="#" onClick={toggleTreeItem} onContextMenu={props.remoteContextMenu} data-remote={item}>{item}</a>
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
