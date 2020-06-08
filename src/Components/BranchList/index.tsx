import { h, Component, Fragment } from "preact";
import { Link } from "@weedzcokie/router-tsx";
import { remote } from "electron";

import "./style.css";
import { getBranchTree, filterBranches, BranchTree, normalizeLocalName } from "../../Data/Branch";
import { BranchesObj, BranchObj } from "../../Data/Actions";
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

function showOriginMenu(e: any) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget;
    originMenu.popup({
        window: remote.getCurrentWindow()
    });
}
function showRemoteMenu(e: any) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget;
    remoteMenu.popup({
        window: remote.getCurrentWindow()
    });
}
function showLocalMenu(e: any) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget;
    localMenu.popup({
        window: remote.getCurrentWindow()
    });
}
function showHeadMenu(e: any) {
    e.preventDefault();
    contextMenuState.data = e.currentTarget;
    headMenu.popup({
        window: remote.getCurrentWindow()
    });
}

function BranchAheadBehind(ref: BranchObj) {
    let aheadbehind = [];
    if (ref.status) {
        if (ref.status.ahead) {
            aheadbehind.push(<span>{ref.status.ahead}&uarr;</span>);
        }
        if (ref.status.behind) {
            aheadbehind.push(<span>{ref.status.behind}&darr;</span>);
        }
    }
    return aheadbehind;
}

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

function branchTree(branches: BranchTree, contextMenuCb?: (event: any) => void, dblClickHandle?: (event: any) => void) {
    const items = [];
    if (branches.subtree) {
        for (const item of Object.keys(branches.subtree)) {
            const children = branchTree(branches.subtree[item], contextMenuCb, dblClickHandle);
            items.push(
                <li class="sub-tree" key={item}>
                    <a href="#" onClick={toggleTreeItem}>{item}</a>
                    {children}
                </li>
            );
        }
    }
    if (branches.items) {
        for (const branch of branches.items) {
            items.push(
                <li key={branch.ref.headSHA}>
                    <Link data-ref={branch.ref.name} onDblClick={dblClickHandle} onContextMenu={contextMenuCb} activeClassName="selected" href={`/branch/${encodeURIComponent(branch.ref.name)}`}>
                        {branch.name}&nbsp;{BranchAheadBehind(branch.ref)}
                    </Link>
                </li>
            );
        }
    }
    return (
        <ul class="tree-list block-list">
            {items}
        </ul>
    );
}
function listRemotes(branches: BranchTree, originContextMenuCb: (event: any) => void, contextMenuCb: (event: any) => void) {
    if (!branches.subtree) {
        return;
    }
    const items = [];
    for (const item of Object.keys(branches.subtree)) {
        const children = branchTree(branches.subtree[item], contextMenuCb);
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
            filter: e.target.value.toLocaleLowerCase()
        });
    }

    render() {
        if (!Store.branches) {
            return <p>Loading...</p>
        }

        const branches = getBranchTree(
            this.state.filter
                ? filterBranches(
                    Store.branches,
                    (value) => value.normalizedName.toLocaleLowerCase().includes(this.state.filter)
                )
                : Store.branches
        );

        let headRef = [];
        if (Store.branches.head) {
            headRef.push(<span>&nbsp;({normalizeLocalName(Store.branches.head.name)})</span>);
            const aheadBehind = BranchAheadBehind(Store.heads[Store.branches.head.headSHA][0]);
            if (aheadBehind.length > 0) {
                headRef.push(<span>&nbsp;{aheadBehind}</span>);
            }
        }

        return (
            <Fragment>
                <div id="branch-pane" class="pane">
                    <div style={{
                        display: "inline-block",
                        minWidth: "100%",
                    }}>
                        <h4>Refs</h4>
                        <ul className="block-list">
                            <li><Link activeClassName="selected" href="/history">History</Link></li>
                            <li><Link onContextMenu={showHeadMenu} activeClassName="selected" data-ref="HEAD" href="/branch/HEAD">HEAD{headRef}</Link></li>
                        </ul>
                        <hr />
                        {branches &&
                        <ul class="tree-list block-list">
                            <li class="sub-tree">
                                <a href="#" onClick={toggleTreeItem}>Local</a>
                                {branchTree(branches.local, showLocalMenu, (e:any) => checkoutBranch(e.currentTarget.dataset.ref))}
                            </li>
                            <hr />
                            <li class="sub-tree">
                                <a href="#" onClick={toggleTreeItem}>Remote</a>
                                {listRemotes(branches.remote, showOriginMenu, showRemoteMenu)}
                            </li>
                            <hr />
                            <li class="sub-tree">
                                <a href="#" onClick={toggleTreeItem}>Tags</a>
                                {branchTree(branches.tags)}
                            </li>
                        </ul>}
                    </div>
                </div>
                <div class="pane">
                    <input type="text" placeholder="Filter..." onKeyUp={this.filter} />
                </div>
            </Fragment>
        );
    }
}
