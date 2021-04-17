import { h, Fragment } from "preact";
import { StoreComponent } from "src/Data/Renderer/store";
import { DialogTypes } from "./types";
import { NewBranch, RenameBranch } from "./Branch";
import { SetUpstream } from "./SetUpstream";
import { Compare } from "./Compare";
import { EditRemote } from "./EditRemote";
import { AddRemote } from "./AddRemote";
import { Settings } from "./Settings";

import "./style.css";

const dialogTypes = {
    [DialogTypes.NEW_BRANCH]: NewBranch,
    [DialogTypes.RENAME_BRANCH]: RenameBranch,
    [DialogTypes.COMPARE]: Compare,
    [DialogTypes.SET_UPSTREAM]: SetUpstream,
    [DialogTypes.EDIT_REMOTE]: EditRemote,
    [DialogTypes.ADD_REMOTE]: AddRemote,
    [DialogTypes.SETTINGS]: Settings,
};

type State = {
    view: h.JSX.Element | null
};
export default class Dialog extends StoreComponent<unknown, State> {
    componentDidMount() {
        this.listen("dialogWindow", dialogWindow => {
            if (dialogWindow) {
                const DialogWindow = dialogTypes[dialogWindow.type];
                const props = dialogWindow.props;
    
                const view = <Fragment>
                    <div className="dialog-window-backdrop" />
                    <div className="dialog-window-container">
                        {
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore, type guarded by Store.openDialogWindow. TODO: get better at types and fix this..
                        <DialogWindow {...props} />
                        }
                    </div>
                </Fragment>;
                this.setState({view});
            } else {
                this.setState({view: null});
            }
        });
    }
    render() {
        return this.state.view;
    }
}
