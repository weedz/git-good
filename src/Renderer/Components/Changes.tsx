import { h } from "preact";
import { IpcAction, IpcActionReturn } from "../../Common/Actions";
import { updateStore, Store, PureStoreComponent } from "../Data/store";
import Link from "./Link";

interface State {
    staged: number
    unstaged: number
}

export default class Changes extends PureStoreComponent<unknown, State> {
    state: Readonly<State> = {
        staged: 0,
        unstaged: 0,
    };
    componentDidMount() {
        this.listen("repo", (repo) => {
            if (repo?.path !== Store.repo?.path) {
                this.forceUpdate();
            }
        });
        this.registerHandler(IpcAction.REFRESH_WORKDIR, (changes: IpcActionReturn[IpcAction.REFRESH_WORKDIR]) => {
            this.setState({
                staged: changes.staged,
                unstaged: changes.unstaged
            });
        });
    }
    render() {
        const changes = this.state.staged + this.state.unstaged;
        return (
            <div id="changes-pane" className="pane">
                <h4>Working area</h4>
                <ul className="block-list">
                    {Store.repo?.status?.bisecting && <li><span>Bisecting</span></li>}
                    {Store.repo?.status?.merging && <li><span>Merging</span></li>}
                    {Store.repo?.status?.rebasing && <li><span>Rebasing</span></li>}
                    {Store.repo?.status?.reverting && <li><span>Reverting</span></li>}
                    <li><Link type="commits" selectAction={() => updateStore({viewChanges: null})}>Changes ({changes})</Link></li>
                </ul>
            </div>
        );
    }
}
