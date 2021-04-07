import { h } from "preact";
import { PureComponent } from "preact/compat";
import { BranchObj, BranchesObj } from "src/Data/Actions";
import { GlobalLinks, updateStore } from "src/Data/Renderer/store";
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
    updateStore({selectedBranch: {branch: c.props.linkData}})
}

// eslint-disable-next-line react/prefer-stateless-function
export class RenderBranchTree extends PureComponent<{
    branches: BranchTree
    contextMenu?: (event: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) => void
    dblClick?: (event: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) => void
    indent: number
}> {
    render() {
        const items = [];
        if (this.props.branches.subtree) {
            for (const item of Object.keys(this.props.branches.subtree)) {
                items.push(
                    <li className="sub-tree" key={item}>
                        <a style={{textIndent: `${this.props.indent}em`}} href="#" onClick={toggleTreeItem}>{item}</a>
                        <RenderBranchTree branches={this.props.branches.subtree[item]} contextMenu={this.props.contextMenu} dblClick={this.props.dblClick} indent={this.props.indent + 1} />
                    </li>
                );
            }
        }
        if (this.props.branches.items) {
            for (const branch of this.props.branches.items) {
                const link = (
                    <Link style={{textIndent: `${this.props.indent}em`}} selectAction={selectAction} onDblClick={this.props.dblClick} onContextMenu={this.props.contextMenu} data-ref={branch.ref.name} linkData={branch.ref.name}>
                        {branch.name}&nbsp;{branchesAheadBehind(branch.ref)}
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
}

// eslint-disable-next-line react/prefer-stateless-function
export class RenderRemotes extends PureComponent<{
    branches: BranchTree
    remoteContextMenu: (event: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) => void
    contextMenu: (event: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) => void
}> {
    render() {
        if (!this.props.branches.subtree) {
            return null;
        }
        const items = [];
        for (const item of Object.keys(this.props.branches.subtree)) {
            items.push(
                <li className="sub-tree">
                    <a style={{textIndent: "1em"}} onContextMenu={this.props.remoteContextMenu} href="#" onClick={toggleTreeItem} data-remote={item}>{item}</a>
                    <RenderBranchTree branches={this.props.branches.subtree[item]} contextMenu={this.props.contextMenu} indent={2} />
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
