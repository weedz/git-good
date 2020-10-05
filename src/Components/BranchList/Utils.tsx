import { h } from "preact";
import { BranchObj, BranchesObj } from "src/Data/Actions";
import { setState } from "src/Data/Renderer/store";
import Link from "../Link";

export type BranchTree = {
    subtree?: {
        [path: string]: BranchTree
    }
    items?: Array<{
        name: string
        ref: BranchObj
    }>
};

export function BranchAheadBehind(ref: BranchObj) {
    let aheadbehind = [];
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

export function toggleTreeItem(e: any) {
    e.preventDefault();
    const parent = e.target.parentNode;
    if (parent.classList.contains("open")) {
        parent.classList.remove("open");
    } else {
        parent.classList.add("open");
    }
    return false;
}

export function branchTree(branches: BranchTree, contextMenuCb?: (event: any) => void, dblClickHandle?: (event: any) => void) {
    const items = [];
    if (branches.subtree) {
        for (const item of Object.keys(branches.subtree)) {
            const children = branchTree(branches.subtree[item], contextMenuCb, dblClickHandle);
            items.push(
                <li className="sub-tree" key={item}>
                    <a href="#" onClick={toggleTreeItem}>{item}</a>
                    {children}
                </li>
            );
        }
    }
    if (branches.items) {
        for (const branch of branches.items) {
            items.push(
                <li key={branch.ref.headSHA}>
                    <Link selectAction={c => setState({selectedBranch: {branch: c.props.linkData}})} data-ref={branch.ref.name} onDblClick={dblClickHandle} onContextMenu={contextMenuCb} activeClassName="selected" linkData={encodeURIComponent(branch.ref.name)}>
                        {branch.name}&nbsp;{BranchAheadBehind(branch.ref)}
                    </Link>
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
export function listRemotes(branches: BranchTree, originContextMenuCb: (event: any) => void, contextMenuCb: (event: any) => void) {
    if (!branches.subtree) {
        return;
    }
    const items = [];
    for (const item of Object.keys(branches.subtree)) {
        const children = branchTree(branches.subtree[item], contextMenuCb);
        items.push(
            <li className="sub-tree">
                <a onContextMenu={originContextMenuCb} href="#" onClick={toggleTreeItem}>{item}</a>
                {children}
            </li>
        );
    }
    return (
        <ul className="tree-list block-list">
            {items}
        </ul>
    )
}

export function transformToBranchTree(branches: BranchObj[]) {
    let root: BranchTree = {};
    for (const branch of branches.sort((a,b) => a.normalizedName.localeCompare(b.normalizedName))) {
        const paths = branch.normalizedName.split("/");

        let tree = root;
        while (paths.length > 1) {
            const path = paths.shift() || "";
            if (!tree.subtree) {
                tree.subtree = {};
            }
            if (!tree.subtree[path]) {
                tree.subtree[path] = {};
            }
            tree = tree.subtree[path];
        }
        if (!tree.items) {
            tree.items = [];
        }
        tree.items.push({
            name: paths[0],
            ref: branch,
        });
    }
    return root;
}

export function getBranchTree(branches: BranchesObj) {
    return {
        local: transformToBranchTree(branches.local),
        remote: transformToBranchTree(branches.remote),
        tags: {
            items: branches.tags.map((tag: BranchObj) => ({
                name: tag.normalizedName,
                ref: {
                    name: tag.name
                }
            })).sort( (a,b) => a.name.localeCompare(b.name))
        } as BranchTree
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
