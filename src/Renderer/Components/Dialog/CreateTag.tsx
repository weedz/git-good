import { h } from "preact";
import { CreateTagProps } from "./types";


export function CreateTag(dialog: CreateTagProps) {
    const data: {name: string, annotation: string} = {
        name: "",
        annotation: "",
    };
    return <div className="dialog-window">
        <form onSubmit={e => {
            e.preventDefault();
            dialog.confirmCb(data);
        }}>
            <h4>Create tag</h4>
            <div>
                <input type="text" name="name" placeholder="Name..." onInput={e => data.name = e.currentTarget.value} value={data.name} />
            </div>
            <div>
                <input type="text" name="annotation" placeholder="Message..." onInput={e => data.annotation = e.currentTarget.value} value={data.annotation} />
            </div>
            <button type="button" onClick={dialog.cancelCb}>Cancel</button>
            <button type="submit">Confirm</button>
        </form>
    </div>;
}
