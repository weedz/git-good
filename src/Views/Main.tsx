import { h, Component } from "preact";
import { RoutableProps } from "router-tsx";
import BranchList from "../../src/Components/BranchList";
import Changes from "../../src/Components/Changes";
import CommitList from "../../src/Components/CommitList";
import DiffPane from "../../src/Components/DiffPane";

export default class Main extends Component<RoutableProps & { sha?: string }> {
    render() {
        console.log(this.props);
        return (
            <div id="main-window">
                <div id="left-pane">
                    <Changes />
                    <BranchList />
                </div>
                <CommitList />
                {this.props.sha && <DiffPane />}
            </div>
        );
    }
}
