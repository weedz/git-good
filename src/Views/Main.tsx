import { h, Component } from "preact";
import CommitList from "src/Components/CommitList";
import DiffPane from "src/Components/DiffPane";

export default class Main extends Component {
    render() {
        return (
            <div style={{
                display: "flex",
                height: "100vh",
                width: "calc(100vw - 200px)",
                overflowY: "auto",
            }}>
                <CommitList />
                <DiffPane />
            </div>
        );
    }
}
