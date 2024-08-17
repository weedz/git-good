import { type PatchObj } from "../../../Common/Actions.js";
import ChangedFiles from "../../Components/DiffPane/ChangedFiles.js";

type Props = {
    patches: PatchObj[];
};

export default function Compare(props: Props) {
    return (
        <div id="diff-pane" class="pane">
            <ChangedFiles patches={props.patches} compare />
        </div>
    );
}
