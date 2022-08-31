export interface Tree<NodeType> {
    item?: NodeType
    children: Map<string, Tree<NodeType>>
}

export function ensureTreePath(tree: Tree<unknown>, segments: string[]): Tree<unknown> {
    let root = tree;
    for (const segment of segments) {
        if (!root.children.has(segment)) {
            root.children.set(segment, {children: new Map()} as Tree<unknown>);
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        root = root.children.get(segment)!;
    }

    return root;
}

