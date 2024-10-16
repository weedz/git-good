import { type h } from "preact";
import { IpcAction } from "../../../Common/Actions.js";
import { commit } from "../../Data/index.js";
import { ipcSendMessage } from "../../Data/IPC.js";
import { notify, Store, store, StoreComponent, type StoreType } from "../../Data/store.js";

type State = {
  commitMsg: StoreType["commitMsg"];
  amend?: boolean;
};

type Props = {
  staged: number;
};

export default class CommitForm extends StoreComponent<Props, State> {
  constructor() {
    super();

    this.state = {
      commitMsg: Store.commitMsg,
    };
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
  };
  async commit() {
    const amend = this.state.amend;
    const message = this.state.commitMsg;
    store.updateStore("commitMsg", {
      body: "",
      summary: "",
    });
    this.setState({
      amend: false,
    });
    const notification = notify({ title: amend ? "Amending commit..." : "Creating commit...", time: 0 });
    const commitObj = await commit({
      message,
      amend,
    });
    if (commitObj) {
      notification.update({ title: amend ? "Commit amended" : "Commit created", body: <p>New commit sha {commitObj.sha}</p>, time: 3000 });
    } else {
      notification.update({ title: "Failed to commit", time: 3000 });
    }
  }
  updateMessage(msg: { summary: string; } | { body: string; }) {
    const commitMsg = this.state.amend ? this.state.commitMsg : Store.commitMsg;
    Object.assign(commitMsg, msg);
    this.setState({ commitMsg });
  }

  render() {
    let commitButton;
    let submitType: "amend" | "rebase" | "commit";
    if (this.state.amend) {
      submitType = "amend";
      commitButton = <button class="fill" type="submit" value="amend" disabled={!this.state.commitMsg.summary.length}>Amend</button>;
    } else if (Store.repoStatus?.rebasing) {
      submitType = "rebase";
      commitButton = <button class="fill" type="submit" value="rebase">Continue rebase</button>;
    } else {
      submitType = "commit";
      commitButton = (
        <button class="fill" type="submit" value="commit" disabled={!this.props.staged || !this.state.commitMsg.summary.length}>Commit</button>
      );
    }

    return (
      <form
        onSubmit={e => {
          e.preventDefault();
          if (submitType === "rebase") {
            ipcSendMessage(IpcAction.CONTINUE_REBASE, null);
          } else {
            this.commit();
          }
        }}
      >
        <div class="flex-row">
          <h4>Commit Message</h4>
          {!Store.repoStatus?.rebasing && (
            <label style="align-self: center; margin-left: auto">
              <input type="checkbox" name="amend" onClick={this.setAmend} checked={this.state.amend} />
              <span>Amend</span>
            </label>
          )}
        </div>
        <input
          type="text"
          style={{ width: "100%" }}
          name="summary"
          placeholder="Summary"
          value={this.state.commitMsg.summary}
          onKeyUp={(e: h.JSX.TargetedEvent<HTMLInputElement, KeyboardEvent>) => {
            this.updateMessage({ summary: e.currentTarget.value });
          }}
        />
        <br />
        <textarea
          id="commit-msg"
          name="msg"
          placeholder="Description"
          onKeyUp={(e: h.JSX.TargetedEvent<HTMLTextAreaElement, KeyboardEvent>) => {
            this.updateMessage({ body: e.currentTarget.value });
          }}
          value={this.state.commitMsg.body}
        />
        <br />
        <div class="flex-row">
          {commitButton}
        </div>
      </form>
    );
  }
}
