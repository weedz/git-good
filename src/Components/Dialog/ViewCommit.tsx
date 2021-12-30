import { h } from "preact";
import { ViewCommitProps } from "./types";


export function ViewCommit(dialog: ViewCommitProps) {
    const data = {
        sha: dialog.data?.sha || "",
    };
    return <div className="dialog-window">
        <form onSubmit={e => {
            e.preventDefault();
            dialog.confirmCb(data.sha);
        }}>
            <h4>View commit</h4>
            <input type="text" name="from" placeholder="Sha" onChange={e => data.sha = e.currentTarget.value} value={data.sha} />
            <button type="button" onClick={dialog.cancelCb}>Cancel</button>
            <button type="submit">Find</button>
        </form>
    </div>;
}
