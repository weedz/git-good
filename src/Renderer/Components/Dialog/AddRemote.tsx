import { createRef, h } from "preact";
import { type DialogProps, DialogTypes, type RemoteProps } from "./types";
import { useEffect } from "preact/hooks";


export function AddRemote(dialog: DialogProps[DialogTypes.ADD_REMOTE]) {
    const data: RemoteProps["data"] = {
        name: "",
        pullFrom: "",
        pushTo: null,
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
            <h4>Add remote</h4>
            <div class="flex-column">
                <label>
                    <p>Name:</p>
                    <input ref={inputRef} type="text" name="name" onInput={e => data.name = e.currentTarget.value} value={data.name} />
                </label>
                <label>
                    <p>Pull from:</p>
                    <input type="text" name="pull" onInput={e => data.pullFrom = e.currentTarget.value} value={data.pullFrom} />
                </label>
                <label>
                    <p>Push to:</p>
                    <input type="text" name="push" onInput={e => data.pushTo = e.currentTarget.value} value={data.pushTo || ""} />
                </label>
            </div>
            <div class="dialog-action-buttons">
                <button type="button" onClick={dialog.cancelCb}>Cancel</button>
                <button type="submit">Confirm</button>
            </div>
        </form>
    </div>;
}
