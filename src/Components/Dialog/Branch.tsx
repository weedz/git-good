import { h } from "preact";
import { BranchProps } from "./types";


function BranchDialog(dialog: BranchProps & {title: string}) {
    const data = {
        branchName: dialog.default || ""
    };
    return <div className="dialog-window">
        <form onSubmit={e => {
            e.preventDefault();
            dialog.confirmCb(data.branchName);
        }}>
            <h4>{dialog.title}</h4>
            <input type="text" name="branchName" placeholder="Name..." onChange={e => data.branchName = e.currentTarget.value} value={data.branchName} />
            <button type="submit">Confirm</button>
            <button type="button" onClick={() => dialog.cancelCb()}>Cancel</button>
        </form>
    </div>;
}

export function NewBranch(dialog: BranchProps) {
    return <BranchDialog {...dialog} title="New branch" />
}

export function RenameBranch(dialog: BranchProps) {
    return <BranchDialog {...dialog} title="Rename branch" />
}
