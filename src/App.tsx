import { h, Component } from "preact";
import { basename } from "path";
import { RouterComponent as Router } from "@weedzcokie/router-tsx";

import Main from "./Views/Main";
import WorkingArea from "./Views/WorkingArea";
import Changes from "./Components/Changes";
import BranchList from "./Components/BranchList";
import { subscribe, Store, unsubscribe, openRepo, StoreType } from "./Data/Renderer/store";

export default class App extends Component {
    openRecent: boolean = true;
    componentDidMount() {
        subscribe(this.update, "repo");
        const path = process.argv[0];
        openRepo(path);
    }
    componentWillUnmount() {
        unsubscribe(this.update, "repo");
    }
    update = (repo: StoreType["repo"]) => {
        if (repo) {
            document.title = basename(repo);
            this.setState({});
        } else if (this.openRecent) {
            this.openRecent = false;
            const recentRepo = localStorage.getItem("recent-repo");
            if (recentRepo) {
                openRepo(recentRepo);
            }
        }
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
                    <Main path="/history" history />
                    <Main path="/history/commit/:sha" history />
                    <Main path="/commit/:sha" />
                    <Main path="/branch/:branch" />
                    <Main path="/branch/:branch/:sha" />
                    <WorkingArea path="/working-area" />
                </Router>
            </div>
        );
    }
}
