import { remote } from "electron";
import { Component, h } from "preact";
import { SettingsProps } from "./types";

type State = {
    authType: "ssh" | "userpass"
    username?: string
    password?: string
    gitEmail: string
    gitName: string
    sshPrivateKey?: string
    sshPublicKey?: string
    sshAgent?: boolean
    useGPG: boolean
}

async function selectFile(cb: (data: string) => void) {
    const result = await remote.dialog.showOpenDialog({});
    if (!result.canceled) {
        cb(result.filePaths[0]);
    }
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
                <div className="pane">
                    <h3>Auth type</h3>
                    <div>
                        <input id="ssh" type="radio" name="auth-type" value="ssh" onChange={this.setAuth} />
                        <label for="ssh">SSH</label>
                        {this.state.authType === "ssh" && (
                            <div>
                                <div>
                                    <label for="ssh-agent">Use SSH agent:</label>
                                    <input id="ssh-agent" type="checkbox" name="ssh-agent" checked={this.state.sshAgent} onChange={e => this.setState({sshAgent: e.currentTarget.checked})} />
                                </div>
                                <div>
                                    <label for="ssh-public-key">SSH Public key:</label>
                                    <button disabled={this.state.sshAgent} id="ssh-public-key" type="file" name="ssh-public-key" onClick={() => selectFile((path) => this.setState({sshPublicKey: path}))}>Browse</button>
                                    {!this.state.sshAgent && <span>{this.state.sshPublicKey}</span>}
                                </div>
                                <div>
                                    <label for="ssh-private-key">SSH Private key:</label>
                                    <button disabled={this.state.sshAgent} id="ssh-private-key" type="file" name="ssh-private-key" onClick={() => selectFile((path) => this.setState({sshPrivateKey: path}))}>Browse</button>
                                    {!this.state.sshAgent && <span>{this.state.sshPrivateKey}</span>}
                                </div>
                            </div>
                        )}
                    </div>
                    <div>
                        <input id="access-token" type="radio" name="auth-type" value="userpass" onChange={this.setAuth} />
                        <label for="access-token">Username/password</label>
                        {this.state.authType === "userpass" && (
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
                        )}
                    </div>
                </div>
                <div className="pane">
                    <h3>Git credentials</h3>
                    <div>
                        <h4>Profiles</h4>
                        <select>
                            <option>Linus Björklund</option>
                        </select>
                    </div>
                    <div>
                        <label for="git-email">Email:</label>
                        <input type="text" id="git-email" name="email" onKeyUp={e => this.setState({gitEmail: e.currentTarget.value})} />
                    </div>
                    <div>
                        <label for="git-name">Name:</label>
                        <input type="text" id="git-name" name="name" onKeyUp={e => this.setState({gitName: e.currentTarget.value})} />
                    </div>
                    <div>
                        <h4>GPG</h4>
                        <div>
                            <label for="use-gpg">Use gpg:</label>
                            <input type="checkbox" id="use-gpg" name="use-gpg" onChange={e => this.setState({useGPG: e.currentTarget.checked})} />
                        </div>
                        {this.state.useGPG &&
                            <div>
                                <div>
                                    <label for="gpg-id">GPG key:</label>
                                    <select>
                                        <option>GPG 1...</option>
                                    </select>
                                </div>
                                <div>
                                    <label for="gpg-commit">Sign commits by default:</label>
                                    <input type="checkbox" id="gpg-commit" name="gpg-commit" />
                                </div>
                                <div>
                                    <label for="gpg-tags">Sign tags by default:</label>
                                    <input type="checkbox" id="gpg-tags" name="gpg-tags" />
                                </div>
                            </div>
                        }
                    </div>
                </div>
                <div className="pane">
                    <h3>Terminal</h3>
                    <div>
                        <label for="terminal-app">Terminal application:</label>
                        <select>
                            <option>gnome-terminal</option>
                        </select>
                    </div>
                </div>
                <button type="button" onClick={() => this.props.confirmCb(this.state)}>Save</button>
                <button type="button" onClick={this.props.cancelCb}>Close</button>
            </form>
        </div>;
    }
}
