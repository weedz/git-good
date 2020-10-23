import { h } from "preact";
import { BranchObj, BranchesObj } from "src/Data/Actions";
import { GlobalLinks, setState } from "src/Data/Renderer/store";
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

export function toggleTreeItem(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const parent = e.currentTarget.parentElement;
    if (parent) {
        if (parent.classList.contains("open")) {
            parent.classList.remove("open");
        } else {
            parent.classList.add("open");
        }
    }
    return false;
}

function selectAction(c: Link<string>) {
    setState({selectedBranch: {branch: c.props.linkData}})
}

export function branchTree(branches: BranchTree, contextMenuCb?: (event: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) => void, dblClickHandle?: (event: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) => void, indent = 1) {
    const items = [];
    if (branches.subtree) {
        for (const item of Object.keys(branches.subtree)) {
            const children = branchTree(branches.subtree[item], contextMenuCb, dblClickHandle, indent + 1);
            items.push(
                <li className="sub-tree" key={item}>
                    <a style={{textIndent: `${indent}em`}} href="#" onClick={toggleTreeItem}>{item}</a>
                    {children}
                </li>
            );
        }
    }
    if (branches.items) {
        for (const branch of branches.items) {
            const link = (
                <Link style={{textIndent: `${indent}em`}} selectAction={selectAction} onDblClick={dblClickHandle} onContextMenu={contextMenuCb} data-ref={branch.ref.name} linkData={branch.ref.name}>
                    {branch.name}&nbsp;{BranchAheadBehind(branch.ref)}
                </Link>
            ) as unknown as Link;
            GlobalLinks.branches[branch.ref.name] = link;
            items.push(
                <li key={branch.ref.headSHA}>{link}</li>
            );
        }
    }
    return (
        <ul className="tree-list block-list">
            {items}
        </ul>
    );
}
export function listRemotes(branches: BranchTree, originContextMenuCb: (event: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) => void, contextMenuCb: (event: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) => void) {
    if (!branches.subtree) {
        return;
    }
    const items = [];
    for (const item of Object.keys(branches.subtree)) {
        const children = branchTree(branches.subtree[item], contextMenuCb, undefined, 2);
        items.push(
            <li className="sub-tree">
                <a style={{textIndent: "1em"}} onContextMenu={originContextMenuCb} href="#" onClick={toggleTreeItem}>{item}</a>
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
    const root: BranchTree = {};
    for (const branch of branches.sort((a,b) => a.normalizedName.localeCompare(b.normalizedName))) {
        const paths = branch.normalizedName.split("/");
        const name = paths.pop() as string;

        let tree = root;

        for (const path of paths) {
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
            name,
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
