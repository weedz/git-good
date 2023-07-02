import { h } from "preact";
import { Store } from "../../Data/store";
import { type PushTagProps } from "./types";


export function PushTag(dialog: PushTagProps) {
    const data = {
        remote: ""
    };
    return <div class="dialog-window">
        <form onSubmit={e => {
            e.preventDefault();
            dialog.confirmCb(data.remote);
        }}>
            <h4>Push to remote:</h4>
            <select name="remote" onInput={e => data.remote = e.currentTarget.value}>
                {Store.remotes.map(remote => <option key={remote.name} value={remote.name} selected={remote.name === data.remote}>{remote.name}</option>)}
            </select>
            <button type="button" onClick={dialog.cancelCb}>Cancel</button>
            <button type="submit">Confirm</button>
        </form>
    </div>;
}
