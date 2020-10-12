import { h, Fragment, Component } from "preact";
import { StoreType, subscribe, unsubscribe } from "src/Data/Renderer/store";
import "./style.css";

type State = {
    view: any
};
export default class Dialog extends Component<{}, State> {
    componentWillMount() {
        subscribe(this.updateDialog, "dialogWindow");
    }
    componentWillUnmount() {
        unsubscribe(this.updateDialog, "dialogWindow");
    }
    updateDialog = (dialogWindow: StoreType["dialogWindow"]) => {
        if (dialogWindow) {
            const data: any = {
                branchName: dialogWindow.defaultValue
            };
            const updateName = (name: string) => {
                data.branchName = name;
            }
            const view = <Fragment>
                <div className="dialog-window-backdrop"></div>
                <div className="dialog-window-container">
                    <div className="dialog-window">
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            dialogWindow.confirmCb(data);
                            return false;
                        }}>
                            <h4>{dialogWindow.title}</h4>
                            <input type="text" name="branchName" placeholder="Name..." onChange={(e) => updateName(e.currentTarget.value)} value={dialogWindow.defaultValue || ""} />
                            <button type="submit">Confirm</button>
                            <button type="button" onClick={() => dialogWindow.cancelCb()}>Cancel</button>
                        </form>
                    </div>
                </div>
            </Fragment>;
            this.setState({view});
        } else {
            this.setState({view: null});
        }
    }
    render() {
        return this.state.view;
    }
}
