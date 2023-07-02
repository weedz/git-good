import { h } from "preact";
import type { StashObj } from "../../../Common/Actions";
import { LinkTypes } from "../../../Common/WindowEventTypes";
import { showStash } from "../../Data";
import { toggleTreeItem } from "../../Data/Tree";
import { PureStoreComponent, Store } from "../../Data/store";
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
            <ul class="tree-list block-list">
                <li class="sub-tree">
                    <a href="#" onClick={toggleTreeItem}>Stash</a>
                    <ul class="tree-list block-list">
                        {Store.stash.map(stash => (
                            <li key={stash.oid} title={stash.msg}>
                                <Link linkType={LinkTypes.COMMITS} style={{textIndent: "1em"}} linkId={stash.oid} linkData={stash} data-index={stash.index} onContextMenu={showStashMenu} selectAction={selectStashItem}>
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
