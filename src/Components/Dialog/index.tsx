import { h, Fragment } from "preact";
import { DialogWindow } from "src/Data/Renderer/store";
import "./style.css";

type Props = {
    dialogWindow: DialogWindow
};

export function Dialog({dialogWindow}: Props) {
    const data: any = {};
    const updateName = (name: string) => {
        data.branchName = name;
    }
    return (
        <Fragment>
            <div class="dialog-window-backdrop"></div>
            <div class="dialog-window-container">
                <div class="dialog-window">
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        dialogWindow.confirmCb(data);
                        return false;
                    }}>
                        <h4>{dialogWindow.title}</h4>
                        <input type="text" name="branchName" placeholder="Name..." onChange={(e) => updateName(e.currentTarget.value)} />
                        <button type="submit">Confirm</button>
                        <button type="button" onClick={() => dialogWindow.cancelCb()}>Cancel</button>
                    </form>
                </div>
            </div>
        </Fragment>
    );
}
