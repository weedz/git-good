import { h, Fragment, Component } from "preact";
import { StoreType, subscribe, unsubscribe } from "src/Data/Renderer/store";
import { DialogProps, DialogTypes } from "./types";
import { NewBranch, RenameBranch } from "./Branch";
import { SetUpstream } from "./SetUpstream";
import { Compare } from "./Compare";

import "./style.css";
import { Blame } from "./Blame";

const dialogTypes: {[type in DialogTypes]: (arg: DialogProps[type]) => h.JSX.Element} = {
    [DialogTypes.NEW_BRANCH]: NewBranch,
    [DialogTypes.RENAME_BRANCH]: RenameBranch,
    [DialogTypes.COMPARE]: Compare,
    [DialogTypes.SET_UPSTREAM]: SetUpstream,
    [DialogTypes.BLAME]: Blame,
};

type State = {
    view: h.JSX.Element | null
};
export default class Dialog extends Component<{}, State> {
    componentWillMount() {
        subscribe(this.updateDialog, "dialogWindow");
    }
    componentWillUnmount() {
        unsubscribe(this.updateDialog, "dialogWindow");
    }
    updateDialog = (dialogWindow: StoreType["dialogWindow"]) => {
        if (dialogWindow) {
            const Dialog = dialogTypes[dialogWindow.type];

            const view = <Fragment>
                <div className="dialog-window-backdrop"></div>
                <div className="dialog-window-container">
                    <div className="dialog-window">
                        {
                        // @ts-ignore, type guarded by Store.openDialogWindow. TODO: get better at types and fix this..
                        <Dialog {...dialogWindow.props} />
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
