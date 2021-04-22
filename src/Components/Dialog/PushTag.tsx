import { h } from "preact";
import { Store } from "src/Data/Renderer/store";
import { PushTagProps } from "./types";


export function PushTag(dialog: PushTagProps) {
    const data = {
        remote: ""
    };
    return <div className="dialog-window">
        <form onSubmit={e => {
            e.preventDefault();
            dialog.confirmCb(data.remote);
        }}>
            <h4>Push to remote:</h4>
            <select name="remote" onChange={e => data.remote = e.currentTarget.value}>
                {Store.remotes.map(remote => <option value={remote.name} selected={remote.name === data.remote}>{remote.name}</option>)}
            </select>
            <button type="submit">Confirm</button>
            <button type="button" onClick={() => dialog.cancelCb()}>Cancel</button>
        </form>
    </div>;
}
