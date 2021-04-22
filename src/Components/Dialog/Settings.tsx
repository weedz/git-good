import { remote } from "electron";
import { Component, Fragment, h } from "preact";
import { IpcAction } from "src/Data/Actions";
import { AppConfig } from "src/Data/Config";
import { ipcGetData } from "src/Data/Renderer/IPC";
import { SettingsProps } from "./types";

type State = {
    config: AppConfig
} & {
    showUserPass: boolean
    saved: null | true
};

async function selectFile(cb: (data: string) => void) {
    const result = await remote.dialog.showOpenDialog({});
    if (!result.canceled) {
        cb(result.filePaths[0]);
    }
}

export class Settings extends Component<SettingsProps, State> {
    setAuth = (e: h.JSX.TargetedEvent<HTMLInputElement, Event>) => {
        this.setConfigKey("authType", e.currentTarget.value as AppConfig["authType"]);
    };

    async componentDidMount() {
        ipcGetData(IpcAction.GET_SETTINGS, null).then(config => {
            this.setState({
                config,
                showUserPass: false
            });
        });
    }

    setConfigKey<T extends keyof AppConfig>(key: T, value: AppConfig[T]) {
        const config = this.state.config;
        config[key] = value;
        this.setState({
            config
        });
    }

    render() {
        if (!this.state.config) {
            return <p>Loading config...</p>
        }
        return <div className="dialog-window" style={{
            width: "100%",
            height: "100%",
            overflowY: "auto",
        }}>
            <form onSubmit={e => {
                e.preventDefault();
                this.props.confirmCb(this.state.config);
            }}>
                <h2>Settings</h2>
                <div className="pane">
                    <h3>Auth type</h3>
                    <div>
                        <input id="ssh" type="radio" name="auth-type" checked={this.state.config.authType !== "userpass"} value="ssh" onChange={this.setAuth} />
                        <label for="ssh">SSH</label>
                        {this.state.config.authType === "ssh" && (
                            <div>
                                <div>
                                    <label for="ssh-agent">Use SSH agent:</label>
                                    <input id="ssh-agent" type="checkbox" name="ssh-agent" checked={this.state.config.sshAgent} onChange={e => this.setConfigKey("sshAgent", e.currentTarget.checked)} />
                                </div>
                                <div>
                                    <label for="ssh-public-key">SSH Public key:</label>
                                    <button disabled={this.state.config.sshAgent} id="ssh-public-key" type="file" name="ssh-public-key" onClick={() => selectFile(path => this.setConfigKey("sshPublicKey", path))}>Browse</button>
                                    {!this.state.config.sshAgent && <span>{this.state.config.sshPublicKey}</span>}
                                </div>
                                <div>
                                    <label for="ssh-private-key">SSH Private key:</label>
                                    <button disabled={this.state.config.sshAgent} id="ssh-private-key" type="file" name="ssh-private-key" onClick={() => selectFile(path => this.setConfigKey("sshPrivateKey", path))}>Browse</button>
                                    {!this.state.config.sshAgent && <span>{this.state.config.sshPrivateKey}</span>}
                                </div>
                            </div>
                        )}
                    </div>
                    <div>
                        <input id="access-token" type="radio" name="auth-type"checked={this.state.config.authType === "userpass"}  value="userpass" onChange={this.setAuth} />
                        <label for="access-token">Username/password</label>
                        {this.state.config.authType === "userpass" && (
                            <div>
                                {!this.state.showUserPass ? <button onClick={() => this.setState({showUserPass: true})}>Show username/password</button> : (
                                    <Fragment>
                                    <div>
                                        <label for="auth-username">Username:</label>
                                        <input id="auth-username" type="text" name="username" value={this.state.config.username} onKeyUp={e => this.setConfigKey("username", e.currentTarget.value)} />
                                    </div>
                                    <div>
                                        <label for="auth-username">Password:</label>
                                        <input id="auth-password" type="text" name="password" value={this.state.config.password} onKeyUp={e => this.setConfigKey("password", e.currentTarget.value)} />
                                    </div>
                                    </Fragment>
                            )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="pane">
                    <h3>Git credentials</h3>
                    <div>
                        <h4>Profiles</h4>
                        <select>
                            <option>default</option>
                        </select>
                    </div>
                    <div>
                        <label for="git-email">Email:</label>
                        <input type="text" id="git-email" name="email" value={this.state.config.gitEmail} onKeyUp={e => this.setConfigKey("gitEmail", e.currentTarget.value)} />
                    </div>
                    <div>
                        <label for="git-name">Name:</label>
                        <input type="text" id="git-name" name="name" value={this.state.config.gitName} onKeyUp={e => this.setConfigKey("gitName", e.currentTarget.value)} />
                    </div>
                    <div>
                        <h4>GPG</h4>
                        <div>
                            <label for="use-gpg">Use gpg:</label>
                            <input type="checkbox" id="use-gpg" name="use-gpg" onChange={e => this.setConfigKey("useGPG", e.currentTarget.checked)} />
                        </div>
                        {this.state.config.useGPG &&
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
                            {/* FIXME: Add valid options for windows and mac, and custom command */}
                            <option>x-terminal-emulator</option>
                        </select>
                    </div>
                </div>
                {this.state.saved && <p>Settings saved!</p>}
                <button type="submit" onClick={() => {
                    this.setState({
                        saved: true
                    });
                    setTimeout(() => {
                        if (this) {
                            this.setState({
                                saved: null
                            });
                        }
                    }, 5000);
                }}>Save</button>
                <button type="button" onClick={this.props.cancelCb}>Close</button>
            </form>
        </div>;
    }
}
