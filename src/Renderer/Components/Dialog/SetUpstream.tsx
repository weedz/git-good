import { h } from "preact";
import { Store } from "../../Data/store";
import { SetUpstreamProps } from "./types";


export function SetUpstream(dialog: SetUpstreamProps) {
    const data = {
        branch: dialog.data.branch,
        remote: dialog.data.remote
    };
    return <div class="dialog-window">
        <form onSubmit={e => {
            e.preventDefault();
            dialog.confirmCb(data.remote, data.branch);
        }}>
            <h4>Set upstream</h4>
            <select name="remote" onInput={e => data.remote = e.currentTarget.value}>
                {Store.remotes.map(remote => <option key={remote.name} value={remote.name} selected={remote.name === data.remote}>{remote.name}</option>)}
            </select>
            <input type="text" name="branch" placeholder="Remote branch..." onInput={e => data.branch = e.currentTarget.value} value={data.branch} />
            <button type="button" onClick={dialog.cancelCb}>Cancel</button>
            <button type="submit">Confirm</button>
        </form>
    </div>;
}
