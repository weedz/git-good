import { h, Component } from "preact";
import { Link } from "@weedzcokie/router-tsx";
import { registerHandler, unregisterHandler } from "src/Data/Renderer";
import { IpcAction } from "src/Data/Actions";
import { refreshWorkdir } from "../Data/Renderer/store";

export default class Changes extends Component {
    state = {
        changes: {
            staged: 0,
            unstaged: 0,
        },
    };
    componentDidMount() {
        registerHandler(IpcAction.REFRESH_WORKDIR, this.updateIndex);
        refreshWorkdir();
    }
    componentWillUnmount() {
        unregisterHandler(IpcAction.REFRESH_WORKDIR, this.updateIndex);
    }
    updateIndex = (changes: any) => {
        if ("staged" in changes) {
            this.setState({
                changes
            });
        }
    }
    render() {
        return (
            <div id="changes-pane" class="pane">
                <h4>Working area</h4>
                <ul>
                    <li><Link activeClassName="selected" href="/working-area">Changes ({this.state.changes.staged + this.state.changes.unstaged})</Link></li>
                </ul>
            </div>
        );
    }
}
