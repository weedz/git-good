import { h } from "preact";
import { type BranchProps } from "./types";


function BranchDialog(dialog: BranchProps & {title: string}) {
    const data = {
        branchName: dialog.data || "",
        checkout: false,
    };
    return <div class="dialog-window">
        <form onSubmit={e => {
            e.preventDefault();
            dialog.confirmCb(data.branchName, data.checkout);
        }}>
            <h4>{dialog.title}</h4>
            <input type="text" name="branchName" placeholder="Name..." onInput={e => data.branchName = e.currentTarget.value} value={data.branchName} /><br />
            <label>
                Checkout: <input type="checkbox" onInput={e => data.checkout = e.currentTarget.checked} /><br />
            </label>
            <button type="button" onClick={dialog.cancelCb}>Cancel</button>
            <button type="submit">Confirm</button>
        </form>
    </div>;
}

export function NewBranch(dialog: BranchProps) {
    return <BranchDialog {...dialog} title="New branch" />
}

export function RenameBranch(dialog: BranchProps) {
    return <BranchDialog {...dialog} title="Rename branch" />
}
