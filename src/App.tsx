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


export default class App extends Component {
    openRecent = true;
    componentDidMount() {
        subscribe(this.update, "repo");
        subscribe(this.checkLocks, "locks");
        const path = process.argv[0];
        openRepo(path);
    }
    componentWillUnmount() {
        unsubscribe(this.update, "repo");
        unsubscribe(this.checkLocks, "locks");
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
        if (Locks.MAIN in locks) {
            this.setState({});
        }
    }
    render() {
        if (!Store.repo) {
            return (
                <NewTab />
            );
        }
        return (
            <div id="main-window" className={Store.locks[Locks.MAIN] ? "disabled" : ""}>
                <Dialog />
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
