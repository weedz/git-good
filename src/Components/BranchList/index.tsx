import { h, Component, Fragment } from "preact";

import "./style.css";
import { normalizeLocalName } from "../../Data/Branch";
import { Locks } from "../../Data/Actions";
import { subscribe, Store, unsubscribe, checkoutBranch, setState, StoreType } from "../../Data/Renderer/store";
import { showHeadMenu, showLocalMenu, showOriginMenu, showRemoteMenu, showTagMenu } from "./Menu";
import { BranchAheadBehind, toggleTreeItem, branchTree, listRemotes, getBranchTree, filterBranches } from "./Utils";
import Link from "../Link";
import { Links } from "../LinkContainer";

type State = {
    filter: string
}

export default class BranchList extends Component<{}, State> {
    componentWillMount() {
        subscribe(this.checkLocks, "locks");
        subscribe(this.update, "branches");
    }
    componentWillUnmount() {
        unsubscribe(this.checkLocks, "locks");
        unsubscribe(this.update, "branches");
    }
    update = () => {
        this.setState({});
    }

    checkLocks = (locks: StoreType["locks"]) => {
        if (Locks.BRANCH_LIST in locks) {
            this.setState({});
        }
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
            if (Store.heads[Store.branches.head.headSHA]) {
                const aheadBehind = BranchAheadBehind(Store.heads[Store.branches.head.headSHA][0]);
                if (aheadBehind.length > 0) {
                    headRef.push(<span>&nbsp;{aheadBehind}</span>);
                }
            }
        }

        return (
            <Fragment>
                <div id="branch-pane" className={`pane${Store.locks[Locks.BRANCH_LIST] ? " disabled" : ""}`}>
                    <Links.Provider value="branches">
                        <h4>Refs</h4>
                        <ul className="block-list">
                            <li><Link selectAction={_ => setState({selectedBranch: {history: true}})}>History</Link></li>
                            {Store.branches.head && <li><Link selectAction={_ => setState({selectedBranch: {branch: "HEAD"}})} onContextMenu={showHeadMenu} data-ref={Store.branches.head.name}>HEAD{headRef}</Link></li>}
                        </ul>
                        <hr />
                        {branches &&
                        <ul className="tree-list block-list">
                            <li className="sub-tree">
                                <a href="#" onClick={toggleTreeItem}>Local</a>
                                {branchTree(branches.local, showLocalMenu, (e:any) => checkoutBranch(e.currentTarget.dataset.ref))}
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
