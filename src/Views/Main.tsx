import { h } from "preact";
import CommitList from "src/Components/CommitList";
import DiffPane from "src/Components/DiffPane";

export default function Main() {
    return (
        <div style={{
            display: "flex",
            width: "calc(100vw - 200px)",
            overflowY: "auto",
        }}>
            <CommitList />
            <DiffPane />
        </div>
    );
}
