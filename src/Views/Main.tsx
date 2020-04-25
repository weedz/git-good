import { h, Component, Fragment } from "preact";
import { RoutableProps } from "router-tsx";
import CommitList from "../Components/CommitList";
import DiffPane from "../Components/DiffPane";
import GraphView from "./GraphView";

export default class Main extends Component<RoutableProps & { sha?: string, branch?: string }> {
    render() {
        let commitView;
        if (!this.props.sha) {
            commitView = <CommitList branch={this.props.branch || "HEAD"} />;
        } else if (this.props.sha && this.props.branch) {
            commitView = <CommitList branch={this.props.branch || "HEAD"} />;
        } else {
            commitView = <GraphView />
        }
        return (
            <Fragment>
                {commitView}
                {this.props.sha && <DiffPane commit={this.props.sha} />}
            </Fragment>
        );
    }
}
