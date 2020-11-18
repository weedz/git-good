import { h, Component } from "preact";
import { registerHandler, unregisterHandler } from "src/Data/Renderer/IPC";
import { IpcAction, IpcActionReturn } from "src/Data/Actions";
import { setState, Store, subscribe } from "../Data/Renderer/store";
import Link from "./Link";

export default class Changes extends Component {
    state = {
        changes: {
            staged: 0,
            unstaged: 0,
        },
    };
    componentWillMount() {
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
                changes
            });
        }
    }
    render() {
        const changes = this.state.changes.staged + this.state.changes.unstaged;
        return (
            <div id="changes-pane" className="pane">
                <h4>Working area</h4>
                <ul className="block-list">
                    {Store.repo?.status?.bisecting && <li><span>Bisecting</span></li>}
                    {Store.repo?.status?.merging && <li><span>Merging</span></li>}
                    {Store.repo?.status?.rebasing && <li><span>Rebasing</span></li>}
                    {Store.repo?.status?.reverting && <li><span>Reverting</span></li>}
                    <li><Link type="commits" selectAction={() => setState({viewChanges: null})}>Changes ({changes})</Link></li>
                </ul>
            </div>
        );
    }
}
