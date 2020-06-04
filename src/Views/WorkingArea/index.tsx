import { h, Component, Fragment } from "preact";
import { RoutableProps } from "@weedzcokie/router-tsx";
import FileDiff from "../../Components/FileDiff";

import "./style.css";

/*

Stage/unstage: Repository#stageFilemode

*/

export default class WorkingArea extends Component<RoutableProps> {
    render() {
        return (
            <div id="working-area">
                <FileDiff />
                <div id="commit-stage">
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
                            <input type="text" name="summary" placeholder="Summary" />
                            <br />
                            <textarea name="msg"></textarea>
                            <br />
                            <input type="submit" name="commit" value="Commit" />
                            <label>
                                <input type="checkbox" name="amend" />
                                <span>Amend</span>
                            </label>
                        </form>
                    </div>
                </div>
            </div>
        );
    }
}
