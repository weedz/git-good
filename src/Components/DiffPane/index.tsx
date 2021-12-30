import { h } from "preact";
import { PureStoreComponent } from "../../Data/Renderer/store";
import Commit from "../../Components/DiffPane/Commit";
import WorkingArea from "../../Views/WorkingArea";
import Compare from "../../Views/Compare";

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
