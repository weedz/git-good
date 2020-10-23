import { h, Fragment, Component } from "preact";
import { StoreType, subscribe, unsubscribe } from "src/Data/Renderer/store";
import { DialogTypes } from "./types";
import { NewBranch, RenameBranch } from "./Branch";
import { SetUpstream } from "./SetUpstream";
import { Compare } from "./Compare";

import "./style.css";
import { Blame } from "./Blame";

const dialogTypes = {
    [DialogTypes.NEW_BRANCH]: NewBranch,
    [DialogTypes.RENAME_BRANCH]: RenameBranch,
    [DialogTypes.COMPARE]: Compare,
    [DialogTypes.SET_UPSTREAM]: SetUpstream,
    [DialogTypes.BLAME]: Blame,
};

type State = {
    view: h.JSX.Element | null
};
export default class Dialog extends Component<unknown, State> {
    componentWillMount() {
        subscribe(this.updateDialog, "dialogWindow");
    }
    componentWillUnmount() {
        unsubscribe(this.updateDialog, "dialogWindow");
    }
    updateDialog = (dialogWindow: StoreType["dialogWindow"]) => {
        if (dialogWindow) {
            const DialogWindow = dialogTypes[dialogWindow.type];
            const props = dialogWindow.props;

            const view = <Fragment>
                <div className="dialog-window-backdrop" />
                <div className="dialog-window-container">
                    <div className="dialog-window">
                        {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore, type guarded by Store.openDialogWindow. TODO: get better at types and fix this..
                        <DialogWindow {...props} />
                        }
                    </div>
                </div>
            </Fragment>;
            this.setState({view});
        } else {
            this.setState({view: null});
        }
    }
    render() {
        return this.state.view;
    }
}
