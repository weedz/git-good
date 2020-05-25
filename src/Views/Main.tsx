import { h, Component, Fragment } from "preact";
import { RoutableProps } from "@weedzcokie/router-tsx";
import CommitList from "../Components/CommitList";
import DiffPane from "../Components/DiffPane";
import FileDiff from "../Components/FileDiff";

export default class Main extends Component<RoutableProps<{ sha?: string, branch?: string }>> {
    render() {
        return (
            <Fragment>
                <FileDiff />
                <CommitList sha={this.props.sha} branch={this.props.branch} />
                {this.props.sha && <DiffPane sha={this.props.sha} />}
            </Fragment>
        );
    }
}
