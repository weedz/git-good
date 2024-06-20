import { createRef } from "preact";
import { type BranchProps } from "./types";
import { useEffect } from "preact/hooks";


function BranchDialog(dialog: BranchProps & { title: string }) {
    const data = {
        branchName: dialog.data || "",
        checkout: false,
    };

    const inputRef = createRef<HTMLInputElement>();
    useEffect(() => {
        inputRef.current?.focus()
    }, [inputRef.current]);

    return <div class="dialog-window">
        <form onSubmit={e => {
            e.preventDefault();
            dialog.confirmCb(data.branchName, data.checkout);
        }}>
            <h4>{dialog.title}</h4>
            <input ref={inputRef} type="text" name="branchName" placeholder="Name..." onInput={e => data.branchName = e.currentTarget.value} value={data.branchName} /><br />
            <label>
                Checkout: <input type="checkbox" onInput={e => data.checkout = e.currentTarget.checked} />
            </label>
            <div class="dialog-action-buttons">
                <button type="button" onClick={dialog.cancelCb}>Cancel</button>
                <button type="submit">Confirm</button>
            </div>
        </form>
    </div>;
}

export function NewBranch(dialog: BranchProps) {
    return <BranchDialog {...dialog} title="New branch" />
}

export function RenameBranch(dialog: BranchProps) {
    return <BranchDialog {...dialog} title="Rename branch" />
}
