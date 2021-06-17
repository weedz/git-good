import { h } from "preact";
import { DialogProps, DialogTypes, RemoteProps } from "./types";


export function AddRemote(dialog: DialogProps[DialogTypes.ADD_REMOTE]) {
    const data: RemoteProps["data"] = {
        name: "",
        pullFrom: "",
        pushTo: null,
    };
    return <div className="dialog-window">
        <form onSubmit={e => {
            e.preventDefault();
            dialog.confirmCb(data);
        }}>
            <h4>Add remote</h4>
            <label>
                <p>Name:</p>
                <input type="text" name="name" onChange={e => data.name = e.currentTarget.value} />
            </label>
            <label>
                <p>Pull from:</p>
                <input type="text" name="pull" onChange={e => data.pullFrom = e.currentTarget.value} />
            </label>
            <label>
                <p>Push to:</p>
                <input type="text" name="push" onChange={e => data.pushTo = e.currentTarget.value} />
            </label>
            <br />
            <button type="submit">Confirm</button>
            <button type="button" onClick={() => dialog.cancelCb()}>Cancel</button>
        </form>
    </div>;
}
