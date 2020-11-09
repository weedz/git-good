import { Component, h } from "preact";
import { SettingsProps } from "./types";

type State = {
    authType: "ssh" | "userpass"
    username?: string
    password?: string
    gitEmail: string
    gitName: string
}

export class Settings extends Component<SettingsProps, State> {
    setAuth = (e: h.JSX.TargetedEvent<HTMLInputElement, Event>) => {
        this.setState({
            authType: e.currentTarget.value as State["authType"]
        });
    };

    render() {
        return <div className="dialog-window" style={{
            width: "100%",
            height: "100%",
            overflowY: "auto",
        }}>
            <form onSubmit={e => {
                e.preventDefault();
            }}>
                <h2>Settings</h2>
                <div>
                    <h4>Auth type</h4>
                    <div>
                        <input id="ssh-agent" type="radio" name="auth-type" value="ssh" onChange={this.setAuth} />
                        <label for="ssh-agent">SSH agent</label>
                    </div>
                    <div>
                        <input id="access-token" type="radio" name="auth-type" value="userpass" onChange={this.setAuth} />
                        <label for="access-token">Username/password</label>
                        {
                            this.state.authType === "userpass" ? (
                                <div>
                                    <div>
                                        <label for="auth-username">Username:</label>
                                        <input id="auth-username" type="text" name="username" value={this.state.username} onKeyUp={e => this.setState({username: e.currentTarget.value})} />
                                    </div>
                                    <div>
                                        <label for="auth-username">Password:</label>
                                        <input id="auth-password" type="password" name="password" value={this.state.password} onKeyUp={e => this.setState({password: e.currentTarget.value})} />
                                    </div>
                                </div>
                            ) : null
                        }
                    </div>
                </div>
                <div>
                    <h2>Git credentials</h2>
                    <div>
                        <label for="git-email">Email:</label>
                        <input type="text" id="git-email" name="email" onKeyUp={e => this.setState({gitEmail: e.currentTarget.value})} />
                    </div>
                    <div>
                        <label for="git-name">Name:</label>
                        <input type="text" id="git-name" name="name" onKeyUp={e => this.setState({gitName: e.currentTarget.value})} />
                    </div>
                </div>
                <button type="button" onClick={() => this.props.confirmCb(this.state)}>Save</button>
                <button type="button" onClick={() => this.props.cancelCb()}>Close</button>
            </form>
        </div>;
    }
}
