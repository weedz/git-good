import { h } from "preact";
import { Store } from "src/Data/Renderer/store";
import { SetUpstreamProps } from "./types";


export function SetUpstream(dialog: SetUpstreamProps) {
    const data = {
        branch: dialog.default.branch,
        remote: dialog.default.remote
    };
    return <form onSubmit={e => {
        e.preventDefault();
        dialog.confirmCb(data.remote, data.branch);
    }}>
        <h4>Set upstream</h4>
        <select name="remote" onChange={e => data.remote = e.currentTarget.value}>
            {Store.remotes.map(remote => <option value={remote} selected={remote === data.remote}>{remote}</option>)}
        </select>
        <input type="text" name="branch" placeholder="Remote branch..." onChange={e => data.branch = e.currentTarget.value} value={data.branch} />
        <button type="submit">Confirm</button>
        <button type="button" onClick={() => dialog.cancelCb()}>Cancel</button>
    </form>;
}