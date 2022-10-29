import { h } from "preact";
import { DialogProps, DialogTypes } from "./types";


export function FileHistory(dialog: DialogProps[DialogTypes.FILE_HISTORY]) {
    const data = {
        filePath: "",
    };
    return <div class="dialog-window">
        <form onSubmit={e => {
            e.preventDefault();
            dialog.confirmCb(data.filePath);
        }}>
            <h4>File</h4>
            <input type="text" name="branch" placeholder="Enter file path..." onInput={e => data.filePath = e.currentTarget.value} value={data.filePath} />
            <button type="button" onClick={dialog.cancelCb}>Cancel</button>
            <button type="submit">Confirm</button>
        </form>
    </div>;
}
