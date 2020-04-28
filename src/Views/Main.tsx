import { h, Component, Fragment } from "preact";
import { RoutableProps } from "@weedz/router-tsx";
import CommitList from "../Components/CommitList";
import DiffPane from "../Components/DiffPane";

export default class Main extends Component<RoutableProps<{ sha?: string, branch?: string }>> {
    render() {
        return (
            <Fragment>
                <CommitList sha={this.props.sha} branch={this.props.branch} />
                {this.props.sha && <DiffPane commit={this.props.sha} />}
            </Fragment>
        );
    }
}
