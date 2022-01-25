import { h } from "preact";
import { RemoteProps } from "./types";


export function EditRemote(dialog: RemoteProps) {
    const data = dialog.data;
    return <div className="dialog-window">
        <form onSubmit={e => {
            e.preventDefault();
            dialog.confirmCb(data);
        }}>
            <h4>Edit remote</h4>
            <label>
                <p>Name:</p>
                <input type="text" name="name" onInput={e => data.name = e.currentTarget.value} value={data.name} />
            </label>
            <label>
                <p>Pull from:</p>
                <input type="text" name="pull" onInput={e => data.pullFrom = e.currentTarget.value} value={data.pullFrom} />
            </label>
            <label>
                <p>Push to:</p>
                <input type="text" name="push" onInput={e => data.pushTo = e.currentTarget.value} value={data.pushTo || ""} />
            </label>
            <br />
            <button type="button" onClick={dialog.cancelCb}>Cancel</button>
            <button type="submit">Confirm</button>
        </form>
    </div>;
}
