import { h, Component } from "preact";
import CommitList from "src/Components/CommitList";
import DiffPane from "src/Components/DiffPane";

type Props = {
    sha?: string
    branch?: string
    history?: boolean
}

export default class Main extends Component<Props> {
    render() {
        return (
            <div style={{
                display: "flex",
                height: "100vh",
                width: "calc(100vw - 200px)",
                overflowY: "auto",
            }}>
                <CommitList sha={this.props.sha} branch={this.props.branch} history={this.props.history} />
                <DiffPane />
            </div>
        );
    }
}
