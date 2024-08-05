import { type h } from "preact";
import "./style.css";
import { HEAD_REF, HISTORY_REF, normalizeLocalName } from "../../../Common/Branch.js";
import { Store, PureStoreComponent, store } from "../../Data/store.js";
import { showHeadMenu, showLocalMenu, showRemoteMenu, showRemoteRefMenu, showRemotesMenu, showTagMenu } from "./Menu.js";
import { branchesAheadBehind, getBranchTree, RenderBranchTree, RenderRemotes } from "./Utils.js";
import Link from "../Link.js";
import { Links } from "../LinkContainer.js";
import { toggleTreeItem } from "../../Data/Tree.js";
import { checkoutBranch } from "../../Data/index.js";
import { LinkTypes } from "../../../Common/WindowEventTypes.js";

function triggerCheckoutBranch(e: h.JSX.TargetedMouseEvent<HTMLAnchorElement>) {
    e.currentTarget.dataset.ref && checkoutBranch(e.currentTarget.dataset.ref);
}

function selectHistory() {
    store.updateStore("selectedBranch", HISTORY_REF);
}
function selectHead() {
    store.updateStore("selectedBranch", HEAD_REF)
}

interface Props {
    branches: ReturnType<typeof getBranchTree>;
}

export default class BranchList extends PureStoreComponent<Props> {
    componentDidMount() {
        this.listen("head");
    }

    render() {
        if (!this.props.branches) {
            return <p>Loading...</p>
        }

        const headRef: h.JSX.Element[] = [];
        if (Store.head) {
            headRef.push(<span>&nbsp;({Store.head.name === HEAD_REF ? `detached ${Store.head.headSHA.substring(0, 8)}` : normalizeLocalName(Store.head.name)})</span>);

            const remote = Store.heads.get(Store.head.headSHA)?.find(head => head.name === Store.head?.name);

            if (remote) {
                const aheadBehind = branchesAheadBehind(remote);
                if (aheadBehind.length > 0) {
                    headRef.push(<span>&nbsp;{aheadBehind}</span>);
                }
            }
        }

        return (
            <Links.Provider value={LinkTypes.BRANCHES}>
                <h4>Refs</h4>
                <ul class="block-list">
                    <li><Link selectAction={selectHistory}>History</Link></li>
                    {Store.head && <li><Link selectAction={selectHead} onContextMenu={showHeadMenu} data-ref={Store.head.name} data-remote={Store.head.remote}>HEAD{headRef}</Link></li>}
                </ul>
                <hr />
                {this.props.branches &&
                    <ul class="tree-list block-list">
                        <li class="sub-tree">
                            <a href="#" onClick={toggleTreeItem}>Local</a>
                            <RenderBranchTree branches={this.props.branches.local} contextMenu={showLocalMenu} dblClick={triggerCheckoutBranch} indent={1} />
                        </li>
                        <hr />
                        <li class="sub-tree">
                            <a href="#" onClick={toggleTreeItem} onContextMenu={showRemotesMenu}>Remote</a>
                            <RenderRemotes branches={this.props.branches.remote} remoteContextMenu={showRemoteMenu} contextMenu={showRemoteRefMenu} />
                        </li>
                        <hr />
                        <li class="sub-tree">
                            <a href="#" onClick={toggleTreeItem}>Tags</a>
                            <RenderBranchTree branches={this.props.branches.tags} contextMenu={showTagMenu} indent={1} />
                        </li>
                    </ul>}
            </Links.Provider>
        );
    }
}
