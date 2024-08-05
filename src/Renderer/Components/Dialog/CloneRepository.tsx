import { createRef } from "preact";
import { useEffect, useState } from "preact/hooks";
import { selectFile } from "../../Data/Utility.js";
import { type DialogProps, DialogTypes } from "./types.js";
import { Store } from "../../Data/store.js";

export function CloneRepositoryDialog(props: DialogProps[DialogTypes.CLONE_REPOSITORY]) {
    const [source, setSource] = useState("");
    const [target, setTarget] = useState("");

    const inputRef = createRef<HTMLInputElement>();
    useEffect(() => {
        inputRef.current?.focus();
    }, [inputRef.current]);

    return <div class="dialog-window">
        <form onSubmit={e => {
            e.preventDefault();
            props.confirmCb({ source, target });
        }}>
            <h4>Clone Repository</h4>
            <label>
                <p>URL:</p>
                <input ref={inputRef} type="text" onInput={(e) => setSource(e.currentTarget.value)} />
            </label>
            <label>
                <p>Clone into:</p>
                <input type="text" value={target} onInput={(e) => setTarget(e.currentTarget.value)} />
                <button type="button" onClick={() =>
                    selectFile(path => setTarget(path), {
                        properties: ["openDirectory", "createDirectory"],
                        title: "Clone into...",
                        defaultPath: Store.repo?.path,
                    })
                }>Browse</button>
            </label>
            <br />
            <div class="dialog-action-buttons">
                <button type="button" onClick={props.cancelCb}>Cancel</button>
                <button type="submit">Confirm</button>
            </div>
        </form>
    </div>;
}
