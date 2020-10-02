import { h, Component } from "preact";
import { subscribe, unsubscribe } from "src/Data/Renderer/store";
import Commit from "src/Components/DiffPane/Commit";
import WorkingArea from "src/Views/WorkingArea";

type State = {
    view: any
}

export default class DiffPane extends Component<{}, State> {
    componentWillMount() {
        subscribe(this.loadCommitFromStore, "diffPaneSrc");
        subscribe(this.viewChanges, "viewChanges");
    }
    componentWillUnmount() {
        unsubscribe(this.loadCommitFromStore, "diffPaneSrc");
        unsubscribe(this.viewChanges, "viewChanges");
    }
    loadCommitFromStore = (sha: string) => {
        const view = <Commit sha={sha} />;
        this.setState({view});
    }
    viewChanges = () => {
        const view = <WorkingArea />;
        this.setState({view});
    }

    render() {
        return this.state.view;
    }
}
