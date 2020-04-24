import { h, Component } from "preact";
import { RouterComponent as Router } from "router-tsx";

import Main from "./Views/Main";
import WorkingArea from "./Views/WorkingArea";

export default class App extends Component {
    render() {
        return (
            <Router>
                <Main path="/" default />
                <Main path="/commit/:sha" />
                <WorkingArea path="/working-area" />
            </Router>
        );
    }
}
