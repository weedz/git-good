import { type h, Fragment } from "preact";
import { StoreComponent } from "../../Data/store.js";
import { DialogTypes } from "./types.js";
import { NewBranch, RenameBranch } from "./Branch.js";
import { SetUpstream } from "./SetUpstream.js";
import { Compare } from "./Compare.js";
import { EditRemote } from "./EditRemote.js";
import { AddRemote } from "./AddRemote.js";
import { Settings } from "./Settings/index.js";
import { CreateTag } from "./CreateTag.js";
import { PushTag } from "./PushTag.js";

import "./style.css";
import { ViewCommit } from "./ViewCommit";
import { CloneRepositoryDialog } from "./CloneRepository";
import { InitRepositoryDialog } from "./InitRepository";
import { dismissibleWindowClosed, showDismissibleWindow } from "../../Data";
import { FileHistory } from "./FileHistory";

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
    [DialogTypes.CLONE_REPOSITORY]: CloneRepositoryDialog,
    [DialogTypes.INIT_REPOSITORY]: InitRepositoryDialog,
    [DialogTypes.FILE_HISTORY]: FileHistory,
};

type State = {
    view: h.JSX.Element | null
};

export default class Dialog extends StoreComponent<unknown, State> {
    componentDidMount() {
        this.listen("dialogWindow", dialogWindow => {
            if (dialogWindow) {
                showDismissibleWindow(this.dismissDialog);
                const DialogWindow = dialogTypes[dialogWindow.type];
                const props = dialogWindow.props;

                const view = (
                    <Fragment>
                        <div class="dialog-window-backdrop" />
                        <div class="dialog-window-container">
                            {
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-ignore, type guarded by Store.openDialogWindow. TODO: get better at types and fix this..
                                <DialogWindow {...props} />
                            }
                        </div>
                    </Fragment>
                );
                this.setState({ view });
            } else {
                dismissibleWindowClosed(this.dismissDialog);
                this.setState({ view: null });
            }
        });
    }
    componentWillUnmount() {
        dismissibleWindowClosed(this.dismissDialog);
    }
    dismissDialog = () => {
        this.setState({ view: null });
    }
    render() {
        return this.state.view;
    }
}
