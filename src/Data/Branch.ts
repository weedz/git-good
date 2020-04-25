export type BranchTree = {
    subtree?: {
        [path: string]: BranchTree | any
    }
    items?: Array<{
        name: string
        ref: any
    }>
};

export function getBranchTree(branches: any) {
    const local: BranchTree = {};
    const remote: BranchTree = {};

    for (const branch of branches.local) {
        // remove "refs/heads/" from branch name
        const normalizedName = branch.name.substring(11);
        const paths = normalizedName.split("/");

        let tree = local;
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

    return {
        local,
        remote,
        tags: {
            items: branches.tags.map((tag: any) => ({
                name: tag.name.substring(10),
                ref: {
                    name: tag.name
                }
            }))
        }
    };
}
