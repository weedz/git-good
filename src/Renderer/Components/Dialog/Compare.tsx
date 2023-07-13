import { createRef, h } from "preact";
import { type CompareProps } from "./types";
import { useEffect } from "preact/hooks";


export function Compare(dialog: CompareProps) {
    const data = {
        from: dialog.data?.from || "",
        to: dialog.data?.to || ""
    };

    const inputRef = createRef<HTMLInputElement>();
    useEffect(() => {
        inputRef.current?.focus();
    }, [inputRef.current]);

    return <div class="dialog-window">
        <form onSubmit={e => {
            e.preventDefault();
            dialog.confirmCb(data.from, data.to);
        }}>
            <h4>Compare</h4>
            <div class="align-center flex-column">
                <input ref={inputRef} type="text" name="from" placeholder="from" onInput={e => data.from = e.currentTarget.value} value={data.from} />
                <span>...</span>
                <input type="text" name="to" placeholder="to" onInput={e => data.to = e.currentTarget.value} value={data.to} />
            </div>
            <div class="dialog-action-buttons">
                <button type="button" onClick={dialog.cancelCb}>Cancel</button>
                <button type="submit">Confirm</button>
            </div>
        </form>
    </div>;
}
