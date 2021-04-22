import { h } from "preact";
import { CreateTagProps } from "./types";


export function CreateTag(dialog: CreateTagProps) {
    const data: {name: string, annotation?: string} = {
        name: ""
    };
    return <div className="dialog-window">
        <form onSubmit={e => {
            e.preventDefault();
            dialog.confirmCb(data);
        }}>
            <h4>Create tag</h4>
            <div>
                <input type="text" name="name" placeholder="Name..." onChange={e => data.name = e.currentTarget.value} value={data.name} />
            </div>
            <div>
                <input type="text" name="annotation" placeholder="Message..." onChange={e => data.annotation = e.currentTarget.value} value={data.annotation} />
            </div>
            <button type="submit">Confirm</button>
            <button type="button" onClick={() => dialog.cancelCb()}>Cancel</button>
        </form>
    </div>;
}
