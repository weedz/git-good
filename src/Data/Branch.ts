import { BranchObj, BranchesObj } from "./Provider";

export type BranchTree = {
    subtree?: {
        [path: string]: BranchTree
    }
    items?: Array<{
        name: string
        ref: BranchObj
    }>
};

function transformToBranchTree(branches: BranchObj[], prefixLength: number) {
    let root: BranchTree = {};
    for (const branch of branches) {
        // remove "prefix" (refs/remotes/, refs/heads/) from branch name
        const normalizedName = branch.name.substring(prefixLength);
        const paths = normalizedName.split("/");

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
        local: transformToBranchTree(branches.local, 11),
        remote: transformToBranchTree(branches.remote, 13),
        tags: {
            items: branches.tags.map((tag: BranchObj) => ({
                // remove prefix (refs/tags/) from name
                name: tag.name.substring(10),
                ref: {
                    name: tag.name
                }
            }))
        }
    };
}
