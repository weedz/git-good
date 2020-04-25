import { h, Component } from "preact";
import { Link } from "router-tsx";

import "./style";
import { getBranchTree } from "../../Data/Branch";
import { registerHandler, IPCAction, sendAsyncMessage, unregisterHandler } from "../../Data/Renderer";

function toggleTreeItem(e: any) {
    const parent = e.target.parentNode;
    if (parent.classList.contains("open")) {
        parent.classList.remove("open");
    } else {
        parent.classList.add("open");
    }
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

export default class BranchList extends Component<any, {branches: any}> {
    componentWillMount() {
        registerHandler(IPCAction.LOAD_BRANCHES, this.loadBranches);
        sendAsyncMessage(IPCAction.LOAD_BRANCHES);
    }
    componentWillUnmount() {
        unregisterHandler(IPCAction.LOAD_BRANCHES, this.loadBranches);
    }
    loadBranches = (branches: any) => {
        this.setState({
            branches: getBranchTree(branches)
        });
    }
    render() {
        return (
            <div id="branch-pane" class="pane">
                <h4>Refs</h4>
                <Link activeClassName="selected" href="/">HEAD (current branch)</Link>
                <hr />
                {this.state.branches && <ul class="tree-list">
                    <li class="sub-tree">
                        <a href="#" onClick={toggleTreeItem}>Local</a>
                        {BranchTree(this.state.branches.local)}
                    </li>
                    <hr />
                    <li class="sub-tree">
                        <a href="#" onClick={toggleTreeItem}>Remote</a>
                        {BranchTree(this.state.branches.remote)}
                    </li>
                    <hr />
                    <li class="sub-tree">
                        <a href="#" onClick={toggleTreeItem}>Tags</a>
                        {BranchTree(this.state.branches.tags)}
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
