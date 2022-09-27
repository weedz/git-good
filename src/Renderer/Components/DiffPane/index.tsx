import { h } from "preact";
import { clearLock, PureStoreComponent } from "../../Data/store";
import Commit from "./Commit";
import WorkingArea from "../../Views/WorkingArea";
import Compare from "../../Views/Compare";
import { Locks } from "../../../Common/Actions";

type State = {
    view: h.JSX.Element | null
}

export default class DiffPane extends PureStoreComponent<unknown, State> {
    componentDidMount() {
        this.listen("diffPaneSrc", sha => {
            if (sha) {
                const view = <Commit sha={sha} />;
                this.setState({view});
            } else {
                this.setState({view: null});
                clearLock(Locks.COMMIT_LIST);
            }
        });
        this.listen("viewChanges", () => {
            const view = <WorkingArea />;
            this.setState({view});
        });
        this.listen("comparePatches", comparePatches => {
            const view = <Compare patches={comparePatches} />
            this.setState({view});
        });
    }

    render() {
        return this.state.view;
    }
}
