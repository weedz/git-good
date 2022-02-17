import { h } from "preact";

import ChangedFiles from "../../Components/DiffPane/ChangedFiles";
import { PatchObj } from "../../Data/Actions";

type Props = {
    patches: PatchObj[]
};

export default function Compare(props: Props) {
    return (
        <div id="diff-pane" className="pane">
            <ChangedFiles patches={props.patches} compare />
        </div>
    );
}
