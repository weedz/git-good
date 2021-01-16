import { h } from "preact";
import { registerHandler, unregisterHandler } from "src/Data/Renderer/IPC";
import { IpcAction, IpcActionReturn } from "src/Data/Actions";
import { updateStore, Store, subscribe } from "../Data/Renderer/store";
import Link from "./Link";
import { PureComponent } from "preact/compat";

export default class Changes extends PureComponent<unknown, {staged: number, unstaged: number}> {
    state = {
        staged: 0,
        unstaged: 0,
    };
    componentDidMount() {
        subscribe(this.repoChanged, "repo");
        registerHandler(IpcAction.REFRESH_WORKDIR, this.updateIndex);
    }
    componentWillUnmount() {
        unregisterHandler(IpcAction.REFRESH_WORKDIR, this.updateIndex);
    }
    repoChanged = () => {
        this.setState({});
    }
    updateIndex = (changes: IpcActionReturn[IpcAction.REFRESH_WORKDIR]) => {
        if (!("error" in changes)) {
            this.setState({
                staged: changes.staged,
                unstaged: changes.unstaged
            });
        }
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
