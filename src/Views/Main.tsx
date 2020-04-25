import { h, Component, Fragment } from "preact";
import { RoutableProps } from "router-tsx";
import CommitList from "../Components/CommitList";
import DiffPane from "../Components/DiffPane";

export default class Main extends Component<RoutableProps & { sha?: string, branch?: string }> {
    render() {
        return (
            <Fragment>
                <CommitList branch={this.props.branch || "HEAD"} />
                {this.props.sha && <DiffPane />}
            </Fragment>
        );
    }
}
