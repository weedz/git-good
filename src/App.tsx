import { h, Component } from "preact";
import { basename } from "path";
import { RouterComponent as Router } from "@weedzcokie/router-tsx";

import Main from "./Views/Main";
import WorkingArea from "./Views/WorkingArea";
import Changes from "./Components/Changes";
import BranchList from "./Components/BranchList";
import { subscribe, Store, unsubscribe, openRepo, StoreType } from "./Data/Renderer/store";
import { Locks } from "./Data/Actions";
import { Dialog } from "./Components/Dialog";

type State = {
    lock: boolean
};

export default class App extends Component<{}, State> {
    openRecent: boolean = true;
    state = {
        lock: false
    }
    componentWillMount() {
        subscribe(this.update, "repo");
        subscribe(this.checkLocks, "locks");
        subscribe(this.updateDialogWindow, "dialogWindow");
        const path = process.argv[0];
        openRepo(path);
    }
    componentWillUnmount() {
        unsubscribe(this.update, "repo");
        unsubscribe(this.checkLocks, "locks");
        unsubscribe(this.updateDialogWindow, "dialogWindow");
    }
    updateDialogWindow = (_: StoreType["dialogWindow"]) => {
        this.setState({});
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
    checkLocks = (locks: StoreType["locks"]) => {
        if (this.state.lock || Locks.MAIN in locks) {
            this.setState({
                lock: locks[Locks.MAIN]
            });
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
                {Store.dialogWindow && <Dialog dialogWindow={Store.dialogWindow} />}
                {this.state.lock && <div class="lock-overlay" />}
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
