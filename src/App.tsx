import { h, Component } from "preact";
import { basename } from "path";
import { RouterComponent as Router } from "@weedzcokie/router-tsx";
import { remote } from "electron";

import Main from "./Views/Main";
import WorkingArea from "./Views/WorkingArea";
import Changes from "./Components/Changes";
import BranchList from "./Components/BranchList";
import { openRepo, subscribe, Store, unsubscribe } from "./Data/Renderer/store";

export default class App extends Component {
    componentDidMount() {
        subscribe(this.update, "repo");
        remote.dialog.showOpenDialog({
            properties: ["openDirectory"]
        }).then(res => {
            if (!res.canceled) {
                document.title = basename(res.filePaths[0])
                openRepo(res.filePaths[0]);
            }
        });
    }
    componentWillUnmount() {
        unsubscribe(this.update, "repo");
    }
    update = () => {
        this.setState({});
    }
    render() {
        if (!Store.repo) {
            return (
                <h1>Opening repo</h1>
            );
        }
        return (
            <div id="main-window">
                <div id="left-pane">
                    <Changes />
                    <BranchList />
                </div>
                <Router>
                    <Main path="/" />
                    <Main path="/commit/:sha" />
                    <Main path="/branch/:branch" />
                    <Main path="/branch/:branch/:sha" />
                    <WorkingArea path="/working-area" />
                </Router>
            </div>
        );
    }
}
