import { createRef, h } from "preact";
import { type CreateTagProps } from "./types";
import { useEffect } from "preact/hooks";


export function CreateTag(dialog: CreateTagProps) {
    const data: {name: string, annotation: string} = {
        name: "",
        annotation: "",
    };

    const inputRef = createRef<HTMLInputElement>();
    useEffect(() => {
        inputRef.current?.focus()
    }, [inputRef.current]);

    return <div class="dialog-window">
        <form onSubmit={e => {
            e.preventDefault();
            dialog.confirmCb(data);
        }}>
            <h4>Create tag</h4>
            <div class="flex-column">
                <input ref={inputRef} type="text" name="name" placeholder="Name..." onInput={e => data.name = e.currentTarget.value} value={data.name} />
                <input type="text" name="annotation" placeholder="Message..." onInput={e => data.annotation = e.currentTarget.value} value={data.annotation} />
            </div>
            <div class="dialog-action-buttons">
                <button type="button" onClick={dialog.cancelCb}>Cancel</button>
                <button type="submit">Confirm</button>
            </div>
        </form>
    </div>;
}
