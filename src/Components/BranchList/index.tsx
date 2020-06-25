import { h, Component, Fragment } from "preact";
import { Link } from "@weedzcokie/router-tsx";

import "./style.css";
import { normalizeLocalName } from "../../Data/Branch";
import { BranchesObj, BranchObj } from "../../Data/Actions";
import { loadBranches, subscribe, Store, unsubscribe, checkoutBranch } from "../../Data/Renderer/store";
import { showHeadMenu, showLocalMenu, showOriginMenu, showRemoteMenu } from "./Menu";
import { BranchAheadBehind, toggleTreeItem, branchTree, listRemotes, BranchTree, getBranchTree, filterBranches } from "./Utils";

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
