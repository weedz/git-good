import CommitList from "../Components/CommitList";
import DiffPane from "../Components/DiffPane";

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
