import { h, Component } from "preact";
import { RouterComponent as Router } from "@weedzcokie/router-tsx";

import Main from "./Views/Main";
import WorkingArea from "./Views/WorkingArea";
import Changes from "./Components/Changes";
import BranchList from "./Components/BranchList";
import DiffPane from "./Components/DiffPane";
import { openRepo, subscribe, Store, unsubscribe } from "./Data/Renderer/store";


type Props = {
    repo?: boolean
}
export default class App extends Component<Props, {}> {
    componentDidMount() {
        subscribe(this.update, "repo");
        openRepo("/home/weedz/Documents/workspace/Router");
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
                    <DiffPane path="/fulldiff/:commit" />
                    <WorkingArea path="/working-area" />
                </Router>
            </div>
        );
    }
}
