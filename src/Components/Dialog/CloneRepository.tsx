import { Component, h } from "preact";
import { selectFile } from "../../Data/Renderer/Utility";
import { DialogProps, DialogTypes } from "./types";

interface State {
    source: string
    target: string
}

export class CloneRepositoryDialog extends Component<DialogProps[DialogTypes.CLONE_REPOSITORY], State> {
    render() {
        return <div className="dialog-window">
            <form onSubmit={e => {
                e.preventDefault();
                this.props.confirmCb(this.state);
            }}>
                <h4>Clone Repository</h4>
                <label>
                    <p>URL:</p>
                    <input type="text" onChange={e => this.setState({ source: e.currentTarget.value })} />
                </label>
                <label>
                    <p>Clone into:</p>
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
