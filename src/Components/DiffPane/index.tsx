import { h, Component } from "preact";
import { StoreType, subscribe, unsubscribe } from "src/Data/Renderer/store";
import Commit from "src/Components/DiffPane/Commit";
import WorkingArea from "src/Views/WorkingArea";
import { PatchObj } from "src/Data/Actions";
import Compare from "src/Views/Compare";

type State = {
    view: h.JSX.Element | null
}

export default class DiffPane extends Component<unknown, State> {
    componentDidMount() {
        subscribe(this.loadCommitFromStore, "diffPaneSrc");
        subscribe(this.viewChanges, "viewChanges");
        subscribe(this.viewCompareResults, "comparePatches");
    }
    componentWillUnmount() {
        unsubscribe(this.loadCommitFromStore, "diffPaneSrc");
        unsubscribe(this.viewChanges, "viewChanges");
        unsubscribe(this.viewCompareResults, "comparePatches");
    }

    loadCommitFromStore = (sha: StoreType["diffPaneSrc"]) => {
        if (sha) {
            const view = <Commit sha={sha} />;
            this.setState({view});
        } else {
            this.setState({view: null});
        }
    }
    viewChanges = () => {
        const view = <WorkingArea />;
        this.setState({view});
    }
    viewCompareResults = (comparePatches: PatchObj[]) => {
        const view = <Compare patches={comparePatches} />
        this.setState({view});
    }

    render() {
        return this.state.view;
    }
}
