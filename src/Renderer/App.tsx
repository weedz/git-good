import { h, Fragment } from "preact";

import Main from "./Views/Main.js";
import Changes from "./Components/Changes.js";
import Branches from "./Components/Branches/index.js";
import { lockChanged, Store, StoreComponent } from "./Data/store.js";
import { Locks } from "../Common/Actions.js";
import Dialog from "./Components/Dialog/index.js";
import FileDiff from "./Components/FileDiff/index.js";
import NotificationsContainer from "./Components/NotificationsContainer.js";
import { NotificationPosition } from "../Common/WindowEventTypes.js";

import "./index.css";
import { basename } from "../Common/Utils.js";
import { Resizable } from "./Components/Resizable.js";

export default class App extends StoreComponent {
    componentDidMount() {
        this.listen("repo", repo => {
            if (repo && repo.path !== Store.repo?.path) {
                document.title = `${basename(repo.path)} - git-good`;
                this.forceUpdate();
            }
        });

        this.listen("locks", locks => {
            if (lockChanged(Locks.MAIN, locks)) {
                this.forceUpdate();
            }
        });
    }
    render() {
        const mainContent = Store.repo
         ? <>
            <Resizable>
                <div id="left-pane">
                    <Changes />
                    <Branches />
                </div>
            </Resizable>
            <FileDiff />
            <Main />
            <NotificationsContainer position={NotificationPosition.DEFAULT} />
        </>
        : <p>Open a repo with File &gt; Open repository...</p>;
        return (
            <div id="main-window" class={Store.locks[Locks.MAIN] ? "disabled" : ""}>
                <Dialog />
                {mainContent}
            </div>
        );
    }
}
