import { h } from "preact";
import { basename } from "path";

import Main from "./Views/Main";
import Changes from "./Components/Changes";
import Branches from "./Components/Branches";
import { Store, StoreComponent } from "./Data/Renderer/store";
import { Locks } from "./Data/Actions";
import Dialog from "./Components/Dialog";
import FileDiff from "./Components/FileDiff";
import NotificationsContainer from "./Components/NotificationsContainer";
import { NotificationPosition } from "./Data/WindowEventTypes";

export default class App extends StoreComponent {
    componentDidMount() {
        this.listen("repo", repo => {
            if (repo) {
                document.title = `${basename(repo.path)} - git-good`;
                this.setState({});
            }
        });

        this.listen("locks", locks => {
            if (Store.locks[Locks.MAIN] !== locks[Locks.MAIN]) {
                this.forceUpdate();
            }
        });
    }
    render() {
        if (!Store.repo) {
            return (
                <p>Open a repo with File &gt; Open repository...</p>
            );
        }
        return (
            <div id="main-window" className={Store.locks[Locks.MAIN] ? "disabled" : ""}>
                <Dialog />
                <div id="left-pane">
                    <Changes />
                    <Branches />
                </div>
                <FileDiff />
                <Main />
                <NotificationsContainer position={NotificationPosition.DEFAULT} />
            </div>
        );
    }
}
