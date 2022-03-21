import { h, Fragment } from "preact";
import { commit, notify, Store, StoreComponent, StoreType, updateStore } from "../../Data/store";

type State = {
    commitMsg: StoreType["commitMsg"]
    amend?: boolean
};

type Props = {
    staged: number
};

export default class CommitForm extends StoreComponent<Props, State> {
    constructor() {
        super();

        this.state = {
            commitMsg: Store.commitMsg,
        }
    }

    componentDidMount() {
        this.listen("commitMsg", commitMsg => this.setState({ commitMsg }));
    }

    setAmend = (e: h.JSX.TargetedEvent<HTMLInputElement, MouseEvent>) => {
        const target = e.currentTarget;
        if (target.checked !== this.state.amend) {
            const amend = target.checked;
            const newState: Partial<State> = {
                amend,
            };
            if (!amend) {
                newState.commitMsg = Store.commitMsg;
            } else if (Store.head) {
                newState.commitMsg = Store.head.commit.message;
            }
            this.setState(newState);
        }
    }
    commit = async (e: h.JSX.TargetedEvent<HTMLInputElement, MouseEvent>) => {
        e.preventDefault();
        const amend = this.state.amend;
        const message = this.state.commitMsg;
        updateStore({
            commitMsg: {
                body: "",
                summary: ""
            }
        });
        this.setState({
            amend: false
        });
        const notification = notify({title: amend ? "Amending commit..." : "Creating commit...", time: 0});
        const commitObj = await commit({
            message,
            amend,
        });
        notification.update({title: amend ? "Commit amended" : "Commit created", body: <p>New commit sha {commitObj.sha}</p>, time: 3000});
    }
    updateMessage(msg: {summary: string} | {body: string}) {
        const commitMsg = this.state.amend ? this.state.commitMsg : Store.commitMsg;
        Object.assign(commitMsg, msg);
        if (this.state.amend) {
            this.setState({commitMsg});
        } else {
            updateStore({commitMsg});
        }
    }

    render() {
        let commitButton;
        if (this.state.amend) {
            commitButton = <input type="submit" name="amend" value="Amend" onClick={this.commit} disabled={!this.state.commitMsg.summary.length} />
        } else if (Store.repo?.status?.rebasing) {
            commitButton = <input type="submit" name="amend" value="Continue rebase" onClick={(e) => {
                e.preventDefault();
            }} />
        } else {
            commitButton = <input type="submit" name="commit" value="Commit" onClick={this.commit} disabled={!this.props.staged || !this.state.commitMsg.summary.length} />
        }

        return <>
            <h4>Commit</h4>
            <form>
                <input type="text" style={{width: "100%"}} name="summary" placeholder="Summary" value={this.state.commitMsg.summary} onKeyUp={(e: h.JSX.TargetedEvent<HTMLInputElement, KeyboardEvent>) => {
                    this.updateMessage({summary: e.currentTarget.value});
                }} />
                <br />
                <textarea id="commit-msg" name="msg" placeholder="Description" onKeyUp={(e: h.JSX.TargetedEvent<HTMLTextAreaElement, KeyboardEvent>) => {
                    this.updateMessage({body: e.currentTarget.value});
                }} value={this.state.commitMsg.body} />
                <br />
                {commitButton}
                <label>
                    <input type="checkbox" name="amend" onClick={this.setAmend} checked={this.state.amend} />
                    <span>Amend</span>
                </label>
            </form>
        </>;
    }
}
