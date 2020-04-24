import { h, Component } from "preact";
import { RoutableProps } from "router-tsx";
import BranchList from "../../src/Components/BranchList";
import Changes from "../../src/Components/Changes";
import FullDiff from "../../src/Components/FullDiff";

export default class WorkingArea extends Component<RoutableProps> {
    render() {
        return (
            <div id="main-window">
                <div id="left-pane">
                    <Changes />
                    <BranchList />
                </div>
                <div id="working-area">
                    <div id="unstaged-changes" class="pane">
                        <h4>Unstaged</h4>
                        <ul>
                            <li>index.js</li>
                        </ul>
                    </div>
                    <div id="staged-changes" class="pane">
                        <h4>Staged</h4>
                        <ul>
                            <li>index.html</li>
                        </ul>
                    </div>
                    <div class="pane">
                        <h4>Commit</h4>
                        <form>
                            <input type="text" name="msg" placeholder="Message..." />
                            <input type="submit" name="commit" value="Commit" />
                            <input type="submit" name="amend" value="Amend" />
                            <input type="button" value="Open editor" />
                        </form>
                    </div>
                </div>
                <FullDiff />
            </div>
        );
    }
}
