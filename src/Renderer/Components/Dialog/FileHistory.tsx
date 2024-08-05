import { createRef } from "preact";
import { useEffect } from "preact/hooks";
import { type DialogProps, DialogTypes } from "./types.js";


export function FileHistory(dialog: DialogProps[DialogTypes.FILE_HISTORY]) {
    const data = {
        filePath: "",
    };

    const inputRef = createRef<HTMLInputElement>();
    useEffect(() => {
        inputRef.current?.focus()
    }, [inputRef.current]);

    return <div class="dialog-window">
        <form onSubmit={e => {
            e.preventDefault();
            dialog.confirmCb(data.filePath);
        }}>
            <h4>File history</h4>
            {/* TODO: We should show a filtered list of all files, similar to `<FileFilter />` */}
            <input ref={inputRef} type="text" name="branch" placeholder="Enter file path..." onInput={e => data.filePath = e.currentTarget.value} value={data.filePath} />
            <div class="dialog-action-buttons">
                <button type="button" onClick={dialog.cancelCb}>Cancel</button>
                <button type="submit">Confirm</button>
            </div>
        </form>
    </div>;
}
