import { h } from "preact";

import ChangedFiles from "../../Components/DiffPane/ChangedFiles";
import { PatchObj } from "../../Data/Actions";

type Props = {
    patches: PatchObj[]
};

export default function Compare(props: Props) {
    return (
        <div id="diff-pane" className="pane">
            {/* We always want a new `ChangedFiles` component when showing a new compare view */}
            <ChangedFiles key={Math.random()} patches={props.patches} compare />
        </div>
    );
}
