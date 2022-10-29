import { h } from "preact";

import ChangedFiles from "../../Components/DiffPane/ChangedFiles";
import { PatchObj } from "../../../Common/Actions";

type Props = {
    patches: PatchObj[]
};

export default function Compare(props: Props) {
    return (
        <div id="diff-pane" class="pane">
            <ChangedFiles patches={props.patches} compare />
        </div>
    );
}
