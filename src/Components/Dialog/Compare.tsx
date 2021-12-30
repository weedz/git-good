import { h } from "preact";
import { CompareProps } from "./types";


export function Compare(dialog: CompareProps) {
    const data = {
        from: dialog.data?.from || "",
        to: dialog.data?.to || ""
    };
    return <div className="dialog-window">
        <form onSubmit={e => {
            e.preventDefault();
            dialog.confirmCb(data.from, data.to);
        }}>
            <h4>Compare</h4>
            <input type="text" name="from" placeholder="from" onChange={e => data.from = e.currentTarget.value} value={data.from} />
            <input type="text" name="to" placeholder="to" onChange={e => data.to = e.currentTarget.value} value={data.to} />
            <button type="button" onClick={dialog.cancelCb}>Cancel</button>
            <button type="submit">Confirm</button>
        </form>
    </div>;
}
