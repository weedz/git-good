import { h, Component } from "preact";
import { RouterComponent as Router } from "@weedzcokie/router-tsx";

import Main from "./Views/Main";
import WorkingArea from "./Views/WorkingArea";
import Changes from "./Components/Changes";
import BranchList from "./Components/BranchList";
import { attach, sendAsyncMessage, registerHandler } from "./Data/Renderer";
import DiffPane from "./Components/DiffPane";
import { IPCAction } from "./Data/Actions";

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
                    <Main path="/commit/:sha" />
                    <Main path="/branch/:branch" />
                    <Main path="/branch/:branch/:sha" />
                    <DiffPane path="/fulldiff/:commit" />
                    <WorkingArea path="/working-area" />
                </Router>
            </div>
        );
    }
}
