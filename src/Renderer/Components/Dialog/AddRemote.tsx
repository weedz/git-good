import { h } from "preact";
import { DialogProps, DialogTypes, RemoteProps } from "./types";


export function AddRemote(dialog: DialogProps[DialogTypes.ADD_REMOTE]) {
    const data: RemoteProps["data"] = {
        name: "",
        pullFrom: "",
        pushTo: null,
    };
    return <div class="dialog-window">
        <form onSubmit={e => {
            e.preventDefault();
            dialog.confirmCb(data);
        }}>
            <h4>Add remote</h4>
            <label>
                <p>Name:</p>
                <input type="text" name="name" onInput={e => data.name = e.currentTarget.value} />
            </label>
            <label>
                <p>Pull from:</p>
                <input type="text" name="pull" onInput={e => data.pullFrom = e.currentTarget.value} />
            </label>
            <label>
                <p>Push to:</p>
                <input type="text" name="push" onInput={e => data.pushTo = e.currentTarget.value} />
            </label>
            <br />
            <button type="button" onClick={dialog.cancelCb}>Cancel</button>
            <button type="submit">Confirm</button>
        </form>
    </div>;
}
