import { h, Component, Fragment } from "preact";
import { RoutableProps } from "@weedzcokie/router-tsx";
import CommitList from "src/Components/CommitList";
import DiffPane from "src/Components/DiffPane";
import FileDiff from "src/Components/FileDiff";

type Props = {
    sha?: string
    branch?: string
    history?: boolean
}
export default class Main extends Component<RoutableProps<Props>> {
    render() {
        return (
            <Fragment>
                <FileDiff />
                <CommitList sha={this.props.sha} branch={this.props.branch} history={this.props.history} />
                {this.props.sha && <DiffPane sha={this.props.sha} />}
            </Fragment>
        );
    }
}
