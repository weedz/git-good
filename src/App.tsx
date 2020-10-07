import { h, Component } from "preact";
import { basename } from "path";

import Main from "./Views/Main";
import Changes from "./Components/Changes";
import BranchList from "./Components/BranchList";
import { subscribe, Store, unsubscribe, openRepo, StoreType } from "./Data/Renderer/store";
import { Locks } from "./Data/Actions";
import Dialog from "./Components/Dialog";
import FileDiff from "./Components/FileDiff";
import NewTab from "./Views/NewTab";

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
            document.title = basename(repo.path);
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
                lock: !!locks[Locks.MAIN]
            });
        }
    }
    render() {
        if (!Store.repo) {
            return (
                <NewTab />
            );
        }
        return (
                <div id="main-window">
                    <Dialog />
                    {this.state.lock && <div className="lock-overlay" />}
                    <div id="left-pane">
                        <Changes />
                        <BranchList />
                    </div>
                    <FileDiff />
                    <Main />
                </div>
        );
    }
}
