import type { JSX } from "preact";

export interface Tree<NodeType = unknown> {
    item?: NodeType
    children: Map<string, Tree<NodeType>>
}

export function ensureTreePath(tree: Tree, segments: string[]): Tree {
    let root = tree;
    for (const segment of segments) {
        let item = root.children.get(segment);
        if (!item) {
            item = {children: new Map()} as Tree;
            root.children.set(segment, item);
        }
        root = item;
    }

    return root;
}

export function toggleTreeItem(e: JSX.TargetedMouseEvent<HTMLAnchorElement>) {
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
