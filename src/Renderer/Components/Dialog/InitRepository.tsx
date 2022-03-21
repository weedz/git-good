import { Component, h } from "preact";
import { selectFile } from "../../Data/Utility";
import { DialogProps, DialogTypes } from "./types";

interface State {
    target: string
}

export class InitRepositoryDialog extends Component<DialogProps[DialogTypes.INIT_REPOSITORY], State> {
    render() {
        return <div className="dialog-window">
            <form onSubmit={e => {
                e.preventDefault();
                this.props.confirmCb(this.state.target);
            }}>
                <h4>Init Repository</h4>
                <label>
                    <p>Path:</p>
                    <input type="text" disabled value={this.state.target} />
                    <button type="button" onClick={() => selectFile(path => this.setState({target: path}), {properties: ["openDirectory", "createDirectory"]})}>Browse</button>
                </label>
                <br />
                <button type="button" onClick={this.props.cancelCb}>Cancel</button>
                <button type="submit">Confirm</button>
            </form>
        </div>;
    }
}
