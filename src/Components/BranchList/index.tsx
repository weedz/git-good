import { h, Component } from "preact";
import { Link } from "@weedzcokie/router-tsx";

import "./style";
import { getBranchTree } from "../../Data/Branch";
import { BranchesObj } from "../../Data/Actions";
import { loadBranches, subscribe, Store, unsubscribe } from "../../Data/Renderer/store";

function toggleTreeItem(e: any) {
    e.preventDefault();
    const parent = e.target.parentNode;
    if (parent.classList.contains("open")) {
        parent.classList.remove("open");
    } else {
        parent.classList.add("open");
    }
    return false;
}

function BranchTree(branches: any) {
    const items = [];
    if (branches.subtree) {
        for (const item of Object.keys(branches.subtree)) {
            const children = BranchTree(branches.subtree[item]);
            items.push(
                <li class="sub-tree">
                    <a href="#" onClick={toggleTreeItem}>{item}</a>
                    {children}
                </li>
            );
        }
    }
    if (branches.items) {
        for (const branch of branches.items) {
            items.push(<li><Link activeClassName="selected" href={`/branch/${encodeURIComponent(branch.ref.name)}`}>{branch.name}</Link></li>);
        }
    }
    return (
        <ul class="tree-list">
            {items}
        </ul>
    )
}

type Props = {
    branches?: BranchesObj
}

export default class BranchList extends Component<Props> {
    componentWillMount() {
        subscribe(this.update, "branches");
        loadBranches();
    }
    componentWillUnmount() {
        unsubscribe(this.update, "branches");
    }
    update = () => {
        this.setState({});
    }

    render() {
        if (!Store.branches) {
            return <p>Loading...</p>
        }

        const branches = getBranchTree(Store.branches);
        const head = Store.branches.head;
        return (
            <div id="branch-pane" class="pane">
                <h4>Refs</h4>
                <Link activeClassName="selected" href="/">HEAD ({head?.name.substring(11)})</Link>
                <hr />
                {branches && <ul class="tree-list">
                    <li class="sub-tree">
                        <a href="#" onClick={toggleTreeItem}>Local</a>
                        {BranchTree(branches.local)}
                    </li>
                    <hr />
                    <li class="sub-tree">
                        <a href="#" onClick={toggleTreeItem}>Remote</a>
                        {BranchTree(branches.remote)}
                    </li>
                    <hr />
                    <li class="sub-tree">
                        <a href="#" onClick={toggleTreeItem}>Tags</a>
                        {BranchTree(branches.tags)}
                    </li>
                    <hr />
                    <li class="sub-tree">
                        <a href="#" onClick={toggleTreeItem}>Stash</a>
                    </li>
                </ul>}
            </div>
        );
    }
}
