import { createRef, h } from "preact";
import { selectFile } from "../../Data/Utility";
import { type DialogProps, DialogTypes } from "./types";
import { useEffect, useState } from "preact/hooks";

export function InitRepositoryDialog(props: DialogProps[DialogTypes.INIT_REPOSITORY]) {
    const [target, setTarget] = useState("");

    const inputRef = createRef<HTMLInputElement>();
    useEffect(() => {
        inputRef.current?.focus();
    }, [inputRef.current]);

    return <div class="dialog-window">
        <form onSubmit={e => {
            e.preventDefault();
            props.confirmCb(target);
        }}>
            <h4>Init Repository</h4>
            <label>
                <p>Path:</p>
                <input ref={inputRef} type="text" value={target} onInput={(e) => setTarget(e.currentTarget.value)} />
                <button type="button" onClick={() => selectFile(path => setTarget(path), {properties: ["openDirectory", "createDirectory"]})}>Browse</button>
            </label>
            <br />
            <div class="dialog-action-buttons">
                <button type="button" onClick={props.cancelCb}>Cancel</button>
                <button type="submit">Confirm</button>
            </div>
        </form>
    </div>;
}
