import { h, Component, Fragment } from "preact";
import { registerHandler, unregisterHandler, sendAsyncMessage } from "src/Data/Renderer";
import { IpcAction, IpcActionReturn } from "src/Data/Actions";

type State = {
    filter: undefined | string
    fileFilter: undefined | string
    fileResults: string[]
    showFiles: undefined | boolean
};

export default class FileFilter extends Component<{filterByFile: any}, State> {
    findFileTimeout?: NodeJS.Timeout;

    componentWillMount() {
        registerHandler(IpcAction.FIND_FILE, this.handleFindFile);
    }
    componentWillUnmount() {
        unregisterHandler(IpcAction.FIND_FILE, this.handleFindFile);
        this.findFileTimeout && clearTimeout(this.findFileTimeout);
    }

    handleFindFile = (files: IpcActionReturn[IpcAction.FIND_FILE]) => {
        this.setState({
            fileResults: files,
            showFiles: files.length > 0,
        });
    }

    filterByFile = (event: any) => {
        this.setState({showFiles: false})
        const file = event ? event.target.dataset.path : undefined;
        this.props.filterByFile(file);
    }
    
    findFiles = (e: any) => {
        this.findFileTimeout && clearTimeout(this.findFileTimeout);
        
        if (e.target.value) {
            this.findFileTimeout = setTimeout(() => {
                sendAsyncMessage(IpcAction.FIND_FILE, e.target.value);
            }, 250);
            this.setState({
                showFiles: true,
                fileFilter: e.target.value,
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
                <input type="text" onClick={() => this.state.fileResults.length > 0 && this.setState({showFiles: true})} onKeyUp={this.findFiles} placeholder="File/path..." />
                {this.state.fileFilter && <button onClick={this.filterByFile}>Reset</button>}
                {this.state.showFiles && this.state.fileResults?.length &&
                    <ul style={{
                        maxHeight: "100px",
                        overflow: "auto",
                    }}>
                        {this.state.fileResults.map(file => <li onClick={this.filterByFile} data-path={file}>{file}</li>)}
                    </ul>
                }
            </Fragment>
        );
    }
}