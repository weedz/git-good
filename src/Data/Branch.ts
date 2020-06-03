import { BranchObj, BranchesObj } from "./Actions";

export type BranchTree = {
    subtree?: {
        [path: string]: BranchTree
    }
    items?: Array<{
        name: string
        ref: BranchObj
        status?: {ahead: number, behind: number}
    }>
};

function transformToBranchTree(branches: BranchObj[]) {
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
            status: branch.status,
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

export function normalizeRemoteName(name: string) {
    // omits the "refs/remotes/" part of the name
    return name.substring(13);
}
export function normalizeLocalName(name: string) {
    // omits the "refs/heads/" part of the name
    return name.substring(11);
}
export function normalizeTagName(name: string) {
    // omits the "refs/tags/" part of the name
    return name.substring(10);
}
