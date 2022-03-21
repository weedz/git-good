import { h, Fragment } from "preact";
import { basename } from "path";

import Main from "./Views/Main";
import Changes from "./Components/Changes";
import Branches from "./Components/Branches";
import { Store, StoreComponent } from "./Data/store";
import { Locks } from "../Common/Actions";
import Dialog from "./Components/Dialog";
import FileDiff from "./Components/FileDiff";
import NotificationsContainer from "./Components/NotificationsContainer";
import { NotificationPosition } from "../Common/WindowEventTypes";

import './index.css';

export default class App extends StoreComponent {
    componentDidMount() {
        this.listen("repo", repo => {
            if (repo && repo.path !== Store.repo?.path) {
                document.title = `${basename(repo.path)} - git-good`;
                this.forceUpdate();
            }
        });

        this.listen("locks", locks => {
            if (Store.locks[Locks.MAIN] !== locks[Locks.MAIN]) {
                this.forceUpdate();
            }
        });
    }
    render() {
        const mainContent = Store.repo
         ? <>
            <div id="left-pane">
                <Changes />
                <Branches />
            </div>
            <FileDiff />
            <Main />
            <NotificationsContainer position={NotificationPosition.DEFAULT} />
        </>
        : <p>Open a repo with File &gt; Open repository...</p>;
        return (
            <div id="main-window" className={Store.locks[Locks.MAIN] ? "disabled" : ""}>
                <Dialog />
                {mainContent}
            </div>
        );
    }
}
