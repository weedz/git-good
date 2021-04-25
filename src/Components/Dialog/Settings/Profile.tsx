import { Component, Fragment, h } from "preact";
import { AppConfig } from "src/Data/Config";
import { selectFile } from "src/Data/Renderer/Utility";

type State = {
    showUserPass: boolean
    config: AppConfig["profiles"][0]
}

type Props = {
    profile: AppConfig["profiles"][0]
    saveProfile: (profile: State["config"]) => void
    cancelCb: () => void
}

export class Profile extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            config: props.profile,
            showUserPass: false,
        };
    }
    setAuth = (e: h.JSX.TargetedEvent<HTMLInputElement, Event>) => {
        this.setConfigKey("authType", e.currentTarget.value as State["config"]["authType"]);
    };

    setConfigKey<T extends keyof State["config"]>(key: T, value: State["config"][T]) {
        const config = this.state.config;
        config[key] = value;
        this.setState({
            config
        });
    }

    render() {
        return <div>
            <form onSubmit={e => {
                e.preventDefault();
                this.props.saveProfile(this.state.config);
            }}>
                <input type="text" value={this.state.config.profileName} onChange={e => e.currentTarget.value.length > 0 && this.setState({
                    config: {
                        ...this.state.config,
                        profileName: e.currentTarget.value
                    }
                })} />
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
                <button type="submit">Save</button>
                <button type="button" onClick={this.props.cancelCb}>Close</button>
            </form>
        </div>;
    }
}
