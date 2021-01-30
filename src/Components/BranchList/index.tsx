import { h, Fragment } from "preact";
import "./style.css";
import { normalizeLocalName } from "../../Data/Branch";
import { BranchesObj, BranchObj, Locks } from "../../Data/Actions";
import { Store, checkoutBranch, updateStore, PureStoreComponent } from "../../Data/Renderer/store";
import { showHeadMenu, showLocalMenu, showOriginMenu, showRemoteMenu, showTagMenu } from "./Menu";
import { branchesAheadBehind, toggleTreeItem, getBranchTree, filterBranches, RenderBranchTree, RenderRemotes } from "./Utils";
import Link from "../Link";
import { Links } from "../LinkContainer";

function triggerCheckoutBranch(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.currentTarget.dataset.ref && checkoutBranch(e.currentTarget.dataset.ref);
}

function selectHistory() {
    updateStore({selectedBranch: {history: true}});
}
function selectHead() {
    updateStore({selectedBranch: {branch: "HEAD"}})
}

type State = {
    filter: string
    branches: ReturnType<typeof getBranchTree>;
    head: BranchObj | undefined
    lock: boolean
}

function branchesToTree(branches: BranchesObj, filter: string | null) {
    return getBranchTree(
        filter
            ? filterBranches(
                branches,
                (value) => value.normalizedName.toLocaleLowerCase().includes(filter)
            )
            : branches
    );
}

export default class BranchList extends PureStoreComponent<unknown, State> {
    componentDidMount() {
        this.listen("locks", (locks) => {
            if (Locks.BRANCH_LIST in locks) {
                this.setState({lock: locks[Locks.BRANCH_LIST]});
            }
        });
        this.listen("branches", branches => {
            this.setState({
                branches: branchesToTree(branches, this.state.filter),
            });
        });
        this.listen("head", head => {
            this.setState({
                head
            });
        });
    }

    filter = (e: h.JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
        if (e.currentTarget.value !== this.state.filter) {
            const filterValue = e.currentTarget.value.toLocaleLowerCase();
            this.setState({
                branches: branchesToTree(Store.branches, filterValue),
                filter: filterValue
            });
        }
    }

    render() {
        if (!this.state.branches) {
            return <p>Loading...</p>
        }

        const headRef = [];
        if (this.state.head) {
            headRef.push(<span>&nbsp;({this.state.head.name === "HEAD" ? `detached ${this.state.head.headSHA.substring(0, 8)}` : normalizeLocalName(this.state.head.name)})</span>);
            if (Store.heads[this.state.head.headSHA]) {
                const aheadBehind = branchesAheadBehind(Store.heads[this.state.head.headSHA][0]);
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
                            <li><Link selectAction={selectHistory}>History</Link></li>
                            {this.state.head && <li><Link selectAction={selectHead} onContextMenu={showHeadMenu} linkData={this.state.head.name} data-ref={this.state.head.name}>HEAD{headRef}</Link></li>}
                        </ul>
                        <hr />
                        {this.state.branches &&
                        <ul className="tree-list block-list">
                            <li className="sub-tree">
                                <a href="#" onClick={toggleTreeItem}>Local</a>
                                <RenderBranchTree branches={this.state.branches.local} contextMenu={showLocalMenu} dblClick={triggerCheckoutBranch} indent={1} />
                            </li>
                            <hr />
                            <li className="sub-tree">
                                <a href="#" onClick={toggleTreeItem}>Remote</a>
                                <RenderRemotes branches={this.state.branches.remote} originContextMenu={showOriginMenu} contextMenu={showRemoteMenu} />
                            </li>
                            <hr />
                            <li className="sub-tree">
                                <a href="#" onClick={toggleTreeItem}>Tags</a>
                                <RenderBranchTree branches={this.state.branches.tags} contextMenu={showTagMenu} indent={1} />
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
