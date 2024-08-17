import type { StashObj } from "../../../Common/Actions.js";
import { LinkTypes } from "../../../Common/WindowEventTypes.js";
import { showStash } from "../../Data/index.js";
import { PureStoreComponent, Store } from "../../Data/store.js";
import { toggleTreeItem } from "../../Data/Tree.js";
import Link from "../Link.js";
import { showStashMenu } from "./Menu.js";

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
                                <Link
                                    linkType={LinkTypes.COMMITS}
                                    style={{ textIndent: "1em" }}
                                    linkId={stash.oid}
                                    linkData={stash}
                                    data-index={stash.index}
                                    onContextMenu={showStashMenu}
                                    selectAction={selectStashItem}
                                >
                                    {stash.index}:{stash.msg.substring(0, 30)}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </li>
            </ul>
        );
    }
}
