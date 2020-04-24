import { h, Component } from "preact";
import { Link } from "router-tsx";

export default class CommitList extends Component {
    render() {
        return (
            <div id="commits-pane" class="pane">
                <h4>Commits</h4>
                <ul>
                    <li class="short">
                        <Link activeClassName="selected" href="/commit/22a4df3">
                            <span class="msg">No need to spread Route since params comes from mapParams</span>
                            <span class="date">2020-10-01 18:00</span>
                            <span class="sha">22a4df3</span>
                            <span class="author">Linus Björklund</span>
                        </Link>
                    </li>
                    <li class="short">
                        <Link activeClassName="selected" href="/commit/1931e14">
                            <span class="msg">find returns a `match` value to indicate if we matched the whole URI</span>
                            <span class="date">2020-10-01 17:59</span>
                            <span class="sha">1931e14</span>
                            <span class="author">Linus Björklund</span>
                        </Link>
                    </li>
                </ul>
            </div>
        );
    }
}
