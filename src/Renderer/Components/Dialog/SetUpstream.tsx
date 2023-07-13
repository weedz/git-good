import { createRef, h } from "preact";
import { Store } from "../../Data/store";
import { type SetUpstreamProps } from "./types";
import { useEffect } from "preact/hooks";


export function SetUpstream(dialog: SetUpstreamProps) {
    const data = {
        branch: dialog.data.branch,
        remote: dialog.data.remote
    };

    const inputRef = createRef<HTMLInputElement>();
    useEffect(() => {
        inputRef.current?.focus()
    }, [inputRef.current]);

    return <div class="dialog-window">
        <form onSubmit={e => {
            e.preventDefault();
            dialog.confirmCb(data.remote, data.branch);
        }}>
            <h4>Set upstream</h4>
            <label>
                <span>Remote:</span>
                <select name="remote" onInput={e => data.remote = e.currentTarget.value}>
                    {Store.remotes.map(remote => <option key={remote.name} value={remote.name} selected={remote.name === data.remote}>{remote.name}</option>)}
                </select>
            </label>
            <input ref={inputRef} type="text" name="branch" placeholder="Remote branch..." onInput={e => data.branch = e.currentTarget.value} value={data.branch} />
            <div class="dialog-action-buttons">
                <button type="button" onClick={dialog.cancelCb}>Cancel</button>
                <button type="submit">Confirm</button>
            </div>
        </form>
    </div>;
}
