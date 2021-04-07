import { h } from "preact";
import { RemoteProps } from "./types";


export function EditRemote(dialog: RemoteProps) {
    const data = dialog.data;
    return <form onSubmit={e => {
        e.preventDefault();
        dialog.confirmCb(data);
    }}>
        <h4>Edit remote</h4>
        <label>
            <p>Name:</p>
            <input type="text" name="name" onChange={e => data.name = e.currentTarget.value} value={data.name} />
        </label>
        <label>
            <p>Pull from:</p>
            <input type="text" name="pull" onChange={e => data.pullFrom = e.currentTarget.value} value={data.pullFrom} />
        </label>
        <label>
            <p>Push to:</p>
            <input type="text" name="push" onChange={e => data.pushTo = e.currentTarget.value} value={data.pushTo} />
        </label>
        <br />
        <button type="submit">Confirm</button>
        <button type="button" onClick={() => dialog.cancelCb()}>Cancel</button>
    </form>;
}
