import { h } from "preact";

import { type PatchObj } from "../../../Common/Actions";
import ChangedFiles from "../../Components/DiffPane/ChangedFiles";

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
