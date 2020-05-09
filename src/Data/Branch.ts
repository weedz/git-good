import { BranchObj, BranchesObj } from "./Actions";

export type BranchTree = {
    subtree?: {
        [path: string]: BranchTree
    }
    items?: Array<{
        name: string
        ref: BranchObj
    }>
};

function transformToBranchTree(branches: BranchObj[]) {
    let root: BranchTree = {};
    for (const branch of branches) {
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
            ref: branch
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
            }))
        }
    };
}
