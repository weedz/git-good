import { h, Component } from "preact";
import { Link } from "@weedzcokie/router-tsx";
import { registerHandler, unregisterHandler } from "src/Data/Renderer";
import { IpcAction, IpcActionReturn } from "src/Data/Actions";
import { refreshWorkdir, Store } from "../Data/Renderer/store";

export default class Changes extends Component {
    state = {
        changes: {
            staged: 0,
            unstaged: 0,
        },
    };
    componentWillMount() {
        registerHandler(IpcAction.REFRESH_WORKDIR, this.updateIndex);
        refreshWorkdir();
    }
    componentWillUnmount() {
        unregisterHandler(IpcAction.REFRESH_WORKDIR, this.updateIndex);
    }
    updateIndex = (changes: IpcActionReturn[IpcAction.REFRESH_WORKDIR]) => {
        if (!("error" in changes)) {
            this.setState({
                changes
            });
        }
    }
    render() {
        return (
            <div id="changes-pane" className="pane">
                <h4>Working area</h4>
                <ul className="block-list">
                    {Store.repo?.status?.bisecting && <li><span>Bisecting</span></li>}
                    {Store.repo?.status?.merging && <li><span>Merging</span></li>}
                    {Store.repo?.status?.rebasing && <li><span>Rebasing</span></li>}
                    {Store.repo?.status?.reverting && <li><span>Reverting</span></li>}
                    <li><Link activeClassName="selected" href="/working-area">Changes ({this.state.changes.staged + this.state.changes.unstaged})</Link></li>
                </ul>
            </div>
        );
    }
}
