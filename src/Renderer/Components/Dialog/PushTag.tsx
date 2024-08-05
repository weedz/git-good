import { createRef } from "preact";
import { useEffect } from "preact/hooks";
import { Store } from "../../Data/store.js";
import { type PushTagProps } from "./types.js";


export function PushTag(dialog: PushTagProps) {
    const data = {
        remote: ""
    };

    const inputRef = createRef<HTMLSelectElement>();
    useEffect(() => {
        inputRef.current?.focus()
    }, [inputRef.current]);

    return <div class="dialog-window">
        <form onSubmit={e => {
            e.preventDefault();
            dialog.confirmCb(data.remote);
        }}>
            <h4>Push tag:</h4>
            <div class="flex-column align-center">
                <label>
                    <span>Remote:</span>
                    <select ref={inputRef} name="remote" onInput={e => data.remote = e.currentTarget.value}>
                        {Store.remotes.map(remote => <option key={remote.name} value={remote.name} selected={remote.name === data.remote}>{remote.name}</option>)}
                    </select>
                </label>
            </div>
            <div class="dialog-action-buttons">
                <button type="button" onClick={dialog.cancelCb}>Cancel</button>
                <button type="submit">Confirm</button>
            </div>
        </form>
    </div>;
}
