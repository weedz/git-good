import { dialog } from "@electron/remote";
import { Component, Fragment, h } from "preact";
import { IpcAction } from "src/Data/Actions";
import { AppConfig } from "src/Data/Config";
import { ipcGetData } from "src/Data/Renderer/IPC";
import { SettingsProps } from "../types";
import { Profile } from "./Profile";

type State = {
    config: AppConfig
} & {
    saved: null | true
    editProfile: null | true
};

export class Settings extends Component<SettingsProps, State> {
    async componentDidMount() {
        ipcGetData(IpcAction.GET_SETTINGS, null).then(config => {
            this.setState({
                config,
            });
        });
    }

    render() {
        if (!this.state.config) {
            return <p>Loading config...</p>
        }

        const profile = this.state.editProfile && this.state.config.profiles[this.state.config.selectedProfile];
        const selectedProfile = this.state.config.profiles[this.state.config.selectedProfile];

        return <div className="dialog-window" style={{
            width: "100%",
            height: "100%",
            overflowY: "auto",
        }}>
            <form onSubmit={e => {
                e.preventDefault();
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
                this.props.confirmCb(this.state.config);
            }}>
                <h2>Settings</h2>
                {
                    profile ? <Profile profile={profile} cancelCb={() => this.setState({editProfile: null})} saveProfile={profile => {
                        const profiles = this.state.config.profiles;
                        profiles[this.state.config.selectedProfile] = profile;
                        console.log(this.state.config.selectedProfile);
                        console.log(profiles);
                        this.setState({
                            config: {
                                ...this.state.config,
                                profiles
                            }
                        }, () => this.props.confirmCb(this.state.config));
                    }} />
                : <Fragment>
                    <div className="pane">
                    <p>Profiles</p>
                    <select onChange={e => {
                        this.setState({
                            config: {
                                ...this.state.config,
                                selectedProfile: Number.parseInt(e.currentTarget.value, 10) || 0
                            }
                        });
                    }}>
                        {this.state.config.profiles.map((profile, idx) => (
                            <option key={profile.profileName} value={idx} selected={idx === this.state.config.selectedProfile}>{profile.profileName}</option>
                        ))}
                    </select>
                    <button type="button" onClick={() => {
                        this.setState({
                            editProfile: true
                        });
                    }}>Edit</button>
                    <button type="button" onClick={() => {
                        const profiles = this.state.config.profiles;
                        profiles.push({
                            profileName: "new profile",
                            authType: "ssh",
                            gitEmail: "",
                            gitName: "",
                            sshAgent: true,
                            useGPG: false,
                        });
                        this.setState({
                            config: {
                                ...this.state.config,
                                profiles,
                                selectedProfile: profiles.length - 1,
                            },
                            editProfile: true,
                        });
                    }}>New</button>
                    <button type="button" onClick={async () => {
                        if (this.state.config.selectedProfile === 0) {
                            return;
                        }
                        const result = await dialog.showMessageBox({
                            message: `Delete profile ${selectedProfile.profileName}?`,
                            type: "question",
                            buttons: ["No", "Yes"],
                            cancelId: 0,
                        });
                        if (result.response === 1) {
                            const profiles = this.state.config.profiles;
                            profiles.splice(this.state.config.selectedProfile, 1);
                            this.setState({
                                config: {
                                    ...this.state.config,
                                    profiles,
                                    selectedProfile: 0
                                }
                            }, () => this.props.confirmCb(this.state.config));
                        }
                    }}>Delete</button>
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
                <button type="submit">Save</button>
                <button type="button" onClick={this.props.cancelCb}>Close</button>
                    </Fragment>}
            </form>
        </div>;
    }
}
