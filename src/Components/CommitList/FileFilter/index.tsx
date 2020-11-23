import { h, Component, Fragment } from "preact";
import { IpcAction, IpcActionReturn } from "src/Data/Actions";
import { registerHandler, sendAsyncMessage, unregisterHandler } from "src/Data/Renderer/IPC";

import "./style.css";

type State = {
    filter: undefined | string
    fileFilter: undefined | string
    fileResults: string[]
    showFiles: undefined | boolean
};

export default class FileFilter extends Component<{filterByFile: (file: string | undefined) => void}, State> {
    // eslint-disable-next-line no-undef
    findFileTimeout?: NodeJS.Timeout;

    componentDidMount() {
        registerHandler(IpcAction.FIND_FILE, this.handleFindFile);
    }
    componentWillUnmount() {
        unregisterHandler(IpcAction.FIND_FILE, this.handleFindFile);
        this.findFileTimeout && clearTimeout(this.findFileTimeout);
    }

    handleFindFile = (data: IpcActionReturn[IpcAction.FIND_FILE]) => {
        const files = data.result;
        this.setState({
            fileResults: files,
            showFiles: files.length > 0,
        });
    }

    filterByFile = (event: h.JSX.TargetedMouseEvent<HTMLElement>) => {
        this.setState({showFiles: false})
        const file = event ? event.currentTarget.dataset.path : undefined;
        this.props.filterByFile(file);
    }
    
    findFiles = (e: h.JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
        this.findFileTimeout && clearTimeout(this.findFileTimeout);
        
        if (e.currentTarget.value) {
            const value = e.currentTarget.value;
            this.findFileTimeout = setTimeout(() => {
                sendAsyncMessage(IpcAction.FIND_FILE, value);
            }, 250);
            this.setState({
                showFiles: true,
                fileFilter: value,
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
                <input type="text" onClick={() => this.state.fileResults?.length > 0 && this.setState({showFiles: true})} onKeyUp={this.findFiles} placeholder="File/path..." />
                {this.state.fileFilter && <button onClick={this.filterByFile}>Reset</button>}
                {this.state.showFiles && !!this.state.fileResults?.length &&
                    <ul id="file-filter-list">
                        {this.state.fileResults.map(file => <li onClick={this.filterByFile} data-path={file}>{file}</li>)}
                    </ul>
                }
            </Fragment>
        );
    }
}
