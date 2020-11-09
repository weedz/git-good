import { h } from "preact";
import { BlameProps } from "./types";


export function Blame(dialog: BlameProps) {
    const data = {
        file: dialog.defaultValue || "",
    };
    return <div className="dialog-window">
        <form onSubmit={e => {
            e.preventDefault();
            dialog.confirmCb(data.file);
        }}>
            <h4>Blame file</h4>
            <input type="text" name="file" placeholder="File" onChange={e => data.file = e.currentTarget.value} value={data.file} />
            <button type="submit">Confirm</button>
            <button type="button" onClick={() => dialog.cancelCb()}>Cancel</button>
        </form>
    </div>;
}
