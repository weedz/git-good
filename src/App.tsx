import { h, Component } from "preact";
import { RouterComponent as Router } from "router-tsx";

import Main from "./Views/Main";
import WorkingArea from "./Views/WorkingArea";
import Changes from "./Components/Changes";
import BranchList from "./Components/BranchList";
import { attach, sendAsyncMessage, IPCAction, registerHandler } from "./Data/Renderer";

export default class App extends Component<{}, {repo?: any}> {
    constructor() {
        super();
        attach();
        registerHandler(IPCAction.OPEN_REPO, this.repoOpened);
        sendAsyncMessage(IPCAction.OPEN_REPO, "/home/weedz/Documents/workspace/Router");
    }
    repoOpened = (status: any) => {
        this.setState({
            repo: true
        });
    }
    render() {
        if (!this.state.repo) {
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
                    <Main path="/branch/:branch" />
                    <Main path="/branch/:branch/:sha" />
                    <WorkingArea path="/working-area" />
                </Router>
            </div>
        );
    }
}
