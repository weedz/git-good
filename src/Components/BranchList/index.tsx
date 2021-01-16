import { h, Fragment } from "preact";
import { PureComponent } from "preact/compat";
import "./style.css";
import { normalizeLocalName } from "../../Data/Branch";
import { BranchesObj, Locks } from "../../Data/Actions";
import { subscribe, Store, unsubscribe, checkoutBranch, updateStore, StoreType } from "../../Data/Renderer/store";
import { showHeadMenu, showLocalMenu, showOriginMenu, showRemoteMenu, showTagMenu } from "./Menu";
import { BranchAheadBehind, toggleTreeItem, branchTree, listRemotes, getBranchTree, filterBranches } from "./Utils";
import Link from "../Link";
import { Links } from "../LinkContainer";

function triggerCheckoutBranch(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.currentTarget.dataset.ref && checkoutBranch(e.currentTarget.dataset.ref);
}

type State = {
    filter: string
    branches: StoreType["branches"]
    lock: boolean
}

export default class BranchList extends PureComponent<unknown, State> {
    componentDidMount() {
        subscribe(this.checkLocks, "locks");
        subscribe(this.update, "branches");
    }
    componentWillUnmount() {
        unsubscribe(this.checkLocks, "locks");
        unsubscribe(this.update, "branches");
    }
    update = (branches: BranchesObj | null) => {
        this.setState({branches});
    }

    checkLocks = (locks: StoreType["locks"]) => {
        if (Locks.BRANCH_LIST in locks) {
            this.setState({lock: locks[Locks.BRANCH_LIST]});
        }
    }

    filter = (e: h.JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
        e.currentTarget.value !== this.state.filter && this.setState({
            filter: e.currentTarget.value.toLocaleLowerCase()
        });
    }

    render() {
        if (!this.state.branches) {
            return <p>Loading...</p>
        }

        const branches = getBranchTree(
            this.state.filter
                ? filterBranches(
                    this.state.branches,
                    (value) => value.normalizedName.toLocaleLowerCase().includes(this.state.filter)
                )
                : this.state.branches
        );

        const headRef = [];
        if (this.state.branches.head) {
            headRef.push(<span>&nbsp;({normalizeLocalName(this.state.branches.head.name)})</span>);
            if (Store.heads[this.state.branches.head.headSHA]) {
                const aheadBehind = BranchAheadBehind(Store.heads[this.state.branches.head.headSHA][0]);
                if (aheadBehind.length > 0) {
                    headRef.push(<span>&nbsp;{aheadBehind}</span>);
                }
            }
        }

        return (
            <Fragment>
                <div id="branch-pane" className={`pane${this.state.lock ? " disabled" : ""}`}>
                    <Links.Provider value="branches">
                        <h4>Refs</h4>
                        <ul className="block-list">
                            <li><Link selectAction={_ => updateStore({selectedBranch: {history: true}})}>History</Link></li>
                            {this.state.branches.head && <li><Link selectAction={_ => updateStore({selectedBranch: {branch: "HEAD"}})} onContextMenu={showHeadMenu} data-ref={this.state.branches.head.name}>HEAD{headRef}</Link></li>}
                        </ul>
                        <hr />
                        {branches &&
                        <ul className="tree-list block-list">
                            <li className="sub-tree">
                                <a href="#" onClick={toggleTreeItem}>Local</a>
                                {branchTree(branches.local, showLocalMenu, triggerCheckoutBranch)}
                            </li>
                            <hr />
                            <li className="sub-tree">
                                <a href="#" onClick={toggleTreeItem}>Remote</a>
                                {listRemotes(branches.remote, showOriginMenu, showRemoteMenu)}
                            </li>
                            <hr />
                            <li className="sub-tree">
                                <a href="#" onClick={toggleTreeItem}>Tags</a>
                                {branchTree(branches.tags, showTagMenu)}
                            </li>
                        </ul>}
                    </Links.Provider>
                </div>
                <div className="pane">
                    <input type="text" placeholder="Filter..." onKeyUp={this.filter} />
                </div>
            </Fragment>
        );
    }
}
