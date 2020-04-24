import { h, Component } from "preact";
import { Link } from "router-tsx";

export default class Changes extends Component {
    render() {
        return (
            <div id="changes-pane" class="pane">
                <h4>Working area</h4>
                <ul>
                    <li><Link activeClassName="selected" href="/working-area">Changes (1)</Link></li>
                </ul>
            </div>
        );
    }
}
