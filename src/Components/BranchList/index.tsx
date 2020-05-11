import { h, Component, Fragment } from "preact";
import { Link } from "@weedzcokie/router-tsx";
import { remote } from "electron";

import "./style.css";
import { getBranchTree, filterBranches } from "../../Data/Branch";
import { BranchesObj } from "../../Data/Actions";
import { loadBranches, subscribe, Store, unsubscribe, checkoutBranch, contextMenuState } from "../../Data/Renderer/store";

const { Menu, MenuItem } = remote;

const originMenu = new Menu();
originMenu.append(new MenuItem({
    label: 'Fetch...',
    click() {
        console.log("fetch");
        return "fetch";
    }
}));

const remoteMenu = new Menu();
remoteMenu.append(new MenuItem({
    label: 'Checkout...',
    click() {
        console.log("Checkout");
    }
}));
remoteMenu.append(new MenuItem({
    label: 'Delete...',
    click() {
        console.log("Delete");
    }
}));
remoteMenu.append(new MenuItem({
    label: 'Rebase...',
    click() {
        console.log("Rebase");
    }
}));
remoteMenu.append(new MenuItem({
    label: 'Merge...',
    click() {
        console.log("Merge");
    }
}));

const localMenu = new Menu();
localMenu.append(new MenuItem({
    label: 'Checkout...',
    click() {
        checkoutBranch(contextMenuState.data.dataset.ref);
    }
}));
localMenu.append(new MenuItem({
    label: 'Create new branch...',
    click() {
        console.log("Create new branch");
    }
}));
localMenu.append(new MenuItem({
    label: 'Delete...',
    click() {
        console.log("Delete");
    }
}));
localMenu.append(new MenuItem({
    label: 'Rebase...',
    click() {
        console.log("Rebase");
    }
}));
localMenu.append(new MenuItem({
    label: 'Merge...',
    click() {
        console.log("Merge");
    }
}));

const headMenu = new Menu();
headMenu.append(new MenuItem({
    label: 'Push...',
    click() {
        console.log("Push");
    }
}));
headMenu.append(new MenuItem({
    label: 'Pull...',
    click() {
        console.log("Pull");
    }
}));

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

function BranchTree(branches: any, contextMenuCb?: (event: any) => void, dblClickHandle?: (event: any) => void) {
    const items = [];
    if (branches.subtree) {
        for (const item of Object.keys(branches.subtree)) {
            const children = BranchTree(branches.subtree[item], contextMenuCb, dblClickHandle);
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
            items.push(<li>
                <Link data-ref={branch.ref.name} onDblClick={dblClickHandle} onContextMenu={contextMenuCb} activeClassName="selected" href={`/branch/${encodeURIComponent(branch.ref.name)}`}>{branch.name}</Link>
                </li>);
        }
    }
    return (
        <ul class="tree-list">
            {items}
        </ul>
    );
}
function ListRemotes(branches: any, originContextMenuCb: (event: any) => void, contextMenuCb: (event: any) => void) {
    const items = [];
    for (const item of Object.keys(branches.subtree)) {
        const children = BranchTree(branches.subtree[item], contextMenuCb);
        items.push(
            <li class="sub-tree">
                <a onContextMenu={originContextMenuCb} href="#" onClick={toggleTreeItem}>{item}</a>
                {children}
            </li>
        );
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

type State = {
    filter: string
}

export default class BranchList extends Component<Props, State> {
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

    filter = (e: any) => {
        e.target.value !== this.state.filter && this.setState({
            filter: e.target.value
        });
    }
    showOriginMenu = (e: any) => {
        e.preventDefault();
        originMenu.popup({
            window: remote.getCurrentWindow()
        });
    }
    showRemoteMenu = (e: any) => {
        e.preventDefault();
        remoteMenu.popup({
            window: remote.getCurrentWindow()
        });
    }
    showLocalMenu = (e: any) => {
        e.preventDefault();
        contextMenuState.data = e.target;
        localMenu.popup({
            window: remote.getCurrentWindow()
        });
    }
    showHeadMenu = (e: any) => {
        e.preventDefault();
        headMenu.popup({
            window: remote.getCurrentWindow()
        });
    }

    checkoutBranch = (e: any) => {
        checkoutBranch(e.target.dataset.ref);
    }

    render() {
        if (!Store.branches) {
            return <p>Loading...</p>
        }

        const branches = getBranchTree(
            this.state.filter
                ? filterBranches(
                    Store.branches,
                    (value) => value.normalizedName.toLocaleLowerCase().includes(this.state.filter.toLocaleLowerCase())
                )
                : Store.branches
        );
        const head = Store.branches.head;
        return (
            <Fragment>
            <div id="branch-pane" class="pane">
                <h4>Refs</h4>
                <Link onContextMenu={this.showHeadMenu} activeClassName="selected" href="/">HEAD ({head?.name.substring(11)})</Link>
                <hr />
                {branches && <ul class="tree-list">
                    <li class="sub-tree">
                        <a href="#" onClick={toggleTreeItem}>Local</a>
                        {BranchTree(branches.local, this.showLocalMenu, this.checkoutBranch)}
                    </li>
                    <hr />
                    <li class="sub-tree">
                        <a href="#" onClick={toggleTreeItem}>Remote</a>
                        {branches.remote.subtree && ListRemotes(branches.remote, this.showOriginMenu, this.showRemoteMenu)}
                    </li>
                    <hr />
                    <li class="sub-tree">
                        <a href="#" onClick={toggleTreeItem}>Tags</a>
                        {BranchTree(branches.tags)}
                    </li>
                    </ul>}
                </div>
                <div class="pane">
                    <input type="text" placeholder="Filter..." onKeyUp={this.filter} />
                </div>
            </Fragment>
        );
    }
}
