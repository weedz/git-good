import { h, Fragment } from "preact";
import { StoreComponent } from "../../Data/Renderer/store";
import { DialogTypes } from "./types";
import { NewBranch, RenameBranch } from "./Branch";
import { SetUpstream } from "./SetUpstream";
import { Compare } from "./Compare";
import { EditRemote } from "./EditRemote";
import { AddRemote } from "./AddRemote";
import { Settings } from "./Settings";
import { CreateTag } from "./CreateTag";
import { PushTag } from "./PushTag";

import "./style.css";
import { ViewCommit } from "./ViewCommit";

const dialogTypes = {
    [DialogTypes.NEW_BRANCH]: NewBranch,
    [DialogTypes.RENAME_BRANCH]: RenameBranch,
    [DialogTypes.COMPARE]: Compare,
    [DialogTypes.SET_UPSTREAM]: SetUpstream,
    [DialogTypes.EDIT_REMOTE]: EditRemote,
    [DialogTypes.ADD_REMOTE]: AddRemote,
    [DialogTypes.SETTINGS]: Settings,
    [DialogTypes.CREATE_TAG]: CreateTag,
    [DialogTypes.PUSH_TAG]: PushTag,
    [DialogTypes.VIEW_COMMIT]: ViewCommit,
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
        document.addEventListener("keydown", this.handleKeyDown);
    }
    componentWillUnmount() {
        document.removeEventListener("keydown", this.handleKeyDown);
    }
    handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && this.state.view) {
            this.closeDialog();
        }
    }
    closeDialog = () => {
        this.setState({view: null});
    }
    render() {
        return this.state.view;
    }
}
