import { h, Component, Fragment, } from "preact";
import FileDiff from "../../Components/FileDiff";
import Commits from "./Commits";

import ChangedFiles from "src/Components/DiffPane/ChangedFiles";
import { tempComparePatches } from "src/Data/Renderer/store";

export default class Compare extends Component {
    render() {
        const patches = tempComparePatches;
        return (
            <Fragment>
                <FileDiff />
                <Commits />
                <div id="diff-pane" className="pane">
                    {patches && <ChangedFiles patches={patches} compare />}
                </div>
            </Fragment>
        );
    }
}
