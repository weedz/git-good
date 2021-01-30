import { h } from "preact";
import { PureStoreComponent } from "src/Data/Renderer/store";
import Commit from "src/Components/DiffPane/Commit";
import WorkingArea from "src/Views/WorkingArea";
import Compare from "src/Views/Compare";

type State = {
    view: h.JSX.Element | null
}

// FIXME: this should be refactored so we don't have to listen on store changes..

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
