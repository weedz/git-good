import { Component, Fragment, h } from "preact";
import { AppConfig, GpgConfig } from "../../../Data/Config";
import { selectFile } from "../../../Data/Renderer/Utility";

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
    setGpgConfigKey<T extends keyof GpgConfig>(key: T, value: GpgConfig[T]) {
        const gpgConfig = this.state.config.gpg;
        if (!gpgConfig) {
            return;
        }
        gpgConfig[key] = value;
        this.setState({
            config: {
                ...this.state.config,
                gpg: gpgConfig,
            }
        });
    }

    render() {
        return <div>
            <form onSubmit={e => {
                e.preventDefault();
                this.props.saveProfile(this.state.config);
            }}>
                <input type="text" value={this.state.config.profileName} onChange={e => e.currentTarget.value.length > 0 && this.setConfigKey("profileName", e.currentTarget.value)} />
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
                                    <button disabled={this.state.config.sshAgent} id="ssh-public-key" type="button" name="ssh-public-key" onClick={() => selectFile(path => this.setConfigKey("sshPublicKey", path))}>Browse</button>
                                    {!this.state.config.sshAgent && <span>{this.state.config.sshPublicKey}</span>}
                                </div>
                                <div>
                                    <label for="ssh-private-key">SSH Private key:</label>
                                    <button disabled={this.state.config.sshAgent} id="ssh-private-key" type="button" name="ssh-private-key" onClick={() => selectFile(path => this.setConfigKey("sshPrivateKey", path))}>Browse</button>
                                    {!this.state.config.sshAgent && <span>{this.state.config.sshPrivateKey}</span>}
                                </div>
                                <div>
                                    <label for="ssh-passphrase">SSH passphrase:</label>
                                    <input disabled={this.state.config.sshAgent} type="text" id="ssh-passphrase" name="ssh-passphrase" value={this.state.config.sshPassphrase} onKeyUp={e => this.setConfigKey("sshPassphrase", e.currentTarget.value)} />
                                    {!this.state.config.sshAgent && <span>{this.state.config.sshPassphrase}</span>}
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
                </div>
                <div className="pane">
                    <h3>GPG</h3>
                    <label>
                        <span>Enable gpg:</span>
                        <input type="checkbox" checked={!!this.state.config.gpg} onChange={
                            e => this.setConfigKey("gpg", e.currentTarget.checked ? {
                                commit: false,
                                tag: false,
                                key: "",
                                executable: "gpg",
                            } : undefined)
                        } />
                    </label>
                    {!!this.state.config.gpg &&
                    <Fragment>
                        <div>
                            <label for="gpg-key">GPG key:</label>
                            {/* FIXME: list gpg keys from users machine */}
                            {/* <select onChange={e => this.setGpgConfigKey("key", e.currentTarget.value)}>
                                <option value="">None</option>
                            </select> */}
                            <input type="text" id="gpg-key" name="gpg-key" value={this.state.config.gpg.key} onChange={e => this.setGpgConfigKey("key", e.currentTarget.value)} />
                        </div>
                        <div>
                            <label for="gpg-executable">GPG program:</label>
                            <input type="text" id="gpg-executable" name="gpg-executable" value={this.state.config.gpg.executable} onChange={e => this.setGpgConfigKey("executable", e.currentTarget.value)} />
                        </div>
                        <div>
                            <label for="gpg-commit">Sign commits by default:</label>
                            <input type="checkbox" id="gpg-commit" name="gpg-commit" checked={this.state.config.gpg.commit} onChange={e => this.setGpgConfigKey("commit", e.currentTarget.checked)} />
                        </div>
                        <div>
                            <label for="gpg-tags">Sign tags by default:</label>
                            <input type="checkbox" id="gpg-tags" name="gpg-tags" checked={this.state.config.gpg.tag} onChange={e => this.setGpgConfigKey("tag", e.currentTarget.checked)} />
                        </div>
                    </Fragment>
                    }
                </div>
                <button type="button" onClick={this.props.cancelCb}>Close</button>
                <button type="submit">Save</button>
            </form>
        </div>;
    }
}
