import CommitList from "../Components/CommitList/index.js";
import DiffPane from "../Components/DiffPane/index.js";

export default function Main() {
    return (
        <div style={{
            display: "flex",
            flex: "auto",
            overflowY: "auto",
        }}>
            <CommitList />
            <DiffPane />
        </div>
    );
}
