import { h, Component } from "preact";

import ChangedFiles from "src/Components/DiffPane/ChangedFiles";
import { PatchObj } from "src/Data/Actions";

export default class Compare extends Component<{patches: PatchObj[]}> {
    render() {
        return (
            <div id="diff-pane" className="pane">
                <ChangedFiles patches={this.props.patches} compare />
            </div>
        );
    }
}
