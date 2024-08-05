import { LinkTypes } from "../../Common/WindowEventTypes.js";
import { Store, PureStoreComponent, store } from "../Data/store.js";
import Link from "./Link.js";

export default class Changes extends PureStoreComponent<unknown> {
    componentDidMount() {
        this.listen("repo");
        this.listen("repoStatus");
    }
    render() {
        const changes = Store.workDir.staged + Store.workDir.unstaged;
        return (
            <div id="changes-pane" class="pane">
                <h4>Working area</h4>
                <ul class="block-list">
                    {Store.repoStatus?.bisecting && <li><span>Bisecting</span></li>}
                    {Store.repoStatus?.merging && <li><span>Merging</span></li>}
                    {Store.repoStatus?.rebasing && <li><span>Rebasing</span></li>}
                    {Store.repoStatus?.reverting && <li><span>Reverting</span></li>}
                    <li><Link linkType={LinkTypes.COMMITS} selectAction={() => store.updateStore("viewChanges", null)}>Changes ({changes})</Link></li>
                </ul>
            </div>
        );
    }
}
