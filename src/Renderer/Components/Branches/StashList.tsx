import { h } from "preact";
import { StashObj } from "../../../Common/Actions";
import { toggleTreeItem } from "../../Data/Tree";
import { PureStoreComponent, showStash, Store } from "../../Data/store";
import Link from "../Link";
import { showStashMenu } from "./Menu";

function selectStashItem(item: Link<StashObj>) {
    if (item.props.linkData?.index !== undefined) {
        showStash(item.props.linkData.index);
    }
}

export default class StashList extends PureStoreComponent {
    componentDidMount() {
        this.listen("stash");
    }
    render() {
        return (
            <ul className="tree-list block-list">
                <li className="sub-tree">
                    <a href="#" onClick={toggleTreeItem}>Stash</a>
                    <ul className="tree-list block-list">
                        {Store.stash.map(stash => (
                            <li key={stash.oid} title={stash.msg}>
                                <Link type="commits" style={{textIndent: "1em"}} linkId={stash.oid} linkData={stash} data-index={stash.index} onContextMenu={showStashMenu} selectAction={selectStashItem}>
                                    {stash.index}:{stash.msg.substring(0, 30)}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </li>
            </ul>
        )
    }
}
