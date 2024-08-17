import { createRef } from "preact";
import { useEffect } from "preact/hooks";
import { type ViewCommitProps } from "./types.js";

export function ViewCommit(dialog: ViewCommitProps) {
    const data = {
        sha: dialog.data?.sha || "",
    };

    const inputRef = createRef<HTMLInputElement>();
    useEffect(() => {
        inputRef.current?.focus();
    }, [inputRef.current]);

    return (
        <div class="dialog-window">
            <form
                onSubmit={e => {
                    e.preventDefault();
                    dialog.confirmCb(data.sha);
                }}
            >
                <h4>View commit</h4>
                <input ref={inputRef} type="text" name="from" placeholder="Sha" onInput={e => data.sha = e.currentTarget.value} value={data.sha} />
                <div class="dialog-action-buttons">
                    <button type="button" onClick={dialog.cancelCb}>Cancel</button>
                    <button type="submit">Find</button>
                </div>
            </form>
        </div>
    );
}
