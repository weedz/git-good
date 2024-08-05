import { Fragment, type h } from "preact";
import { IpcAction, type IpcResponse } from "../../../../Common/Actions.js";
import { openFileHistory } from "../../../Data/index.js";
import { ipcSendMessage } from "../../../Data/IPC.js";
import { StoreComponent } from "../../../Data/store.js";

import "./style.css";

type State = {
    fileResults: string[]
    showFiles: undefined | boolean
};

export default class FileFilter extends StoreComponent<unknown, State> {
    findFileTimeout?: number;

    componentDidMount() {
        this.registerHandler(IpcAction.FIND_FILE, this.handleFindFile);
    }
    componentWillUnmount() {
        super.componentWillUnmount();
        this.findFileTimeout && clearTimeout(this.findFileTimeout);
    }

    handleFindFile = (files: IpcResponse<IpcAction.FIND_FILE>) => {
        if (files instanceof Error) {
            return;
        }
        this.setState({
            fileResults: files,
            showFiles: files.length > 0,
        });
    }

    openFileHistory = (event: h.JSX.TargetedMouseEvent<HTMLElement>) => {
        const file = event ? event.currentTarget.dataset.path : undefined;
        if (file) {
            openFileHistory(file)
        }
    }

    findFiles = (e: h.JSX.TargetedInputEvent<HTMLInputElement>) => {
        window.clearTimeout(this.findFileTimeout);

        const value = e.currentTarget.value;
        if (value) {
            this.findFileTimeout = window.setTimeout(() => {
                ipcSendMessage(IpcAction.FIND_FILE, value);
            }, 250);
            this.setState({
                showFiles: true,
            });
        } else {
            this.setState({
                showFiles: false,
                fileResults: [],
            });
        }
    }
    render() {
        return (
            <Fragment>
                <input type="text" onClick={() => this.state.fileResults?.length > 0 && this.setState({ showFiles: true })} onInput={this.findFiles} placeholder="File/path..." />
                {this.state.showFiles && !!this.state.fileResults?.length &&
                    <ul id="file-filter-list">
                        {this.state.fileResults.map(file => <li key={file} onClick={this.openFileHistory} data-path={file}>{file}</li>)}
                    </ul>
                }
            </Fragment>
        );
    }
}
