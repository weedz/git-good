import type { JSX } from "preact";

export interface Tree<NodeType = unknown> {
    item?: NodeType
    children: Map<string, Tree<NodeType>>
}

export function ensureTreePath(tree: Tree, segments: string[]): Tree {
    let root = tree;
    for (let i = 0, len = segments.length; i < len; ++i) {
        let item = root.children.get(segments[i]);
        if (!item) {
            item = {children: new Map()};
            root.children.set(segments[i], item);
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
