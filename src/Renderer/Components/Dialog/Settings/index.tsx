import { Component, Fragment, h } from "preact";
import { IpcAction } from "../../../../Common/Actions";
import { AppConfig } from "../../../../Common/Config";
import { NativeDialog } from "../../../../Common/Dialog";
import { openNativeDialog } from "../../../Data/Dialogs";
import { ipcGetData, ipcSendMessage } from "../../../Data/IPC";
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

    setUIConfig<K extends keyof AppConfig["ui"]>(key: K, value: AppConfig["ui"][K]) {
        this.setConfig("ui", {...this.state.config.ui, [key]: value});
    }

    setConfig<K extends keyof AppConfig>(key: K, value: AppConfig[K]) {
        this.setState({
            config: {...this.state.config,
                [key]: value,
            }
        });
    }

    render() {
        if (!this.state.config) {
            return <p>Loading config...</p>
        }

        const selectedProfile = this.state.config.profiles[this.state.config.selectedProfile];

        let formBody;
        if (this.state.editProfile) {
            formBody = <Profile profile={selectedProfile} cancelCb={() => this.setState({editProfile: null})} saveProfile={profile => {
                const profiles = this.state.config.profiles;
                profiles[this.state.config.selectedProfile] = profile;
                this.setState({
                    config: {
                        ...this.state.config,
                        profiles
                    },
                    editProfile: null
                }, () => this.props.confirmCb(this.state.config));
            }} />;
        } else {
            formBody = <Fragment>
                <div className="pane">
                    <h3>Profiles</h3>
                    <select onInput={e => this.setConfig("selectedProfile", Number.parseInt(e.currentTarget.value, 10) || 0)}>
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
                        ipcSendMessage(IpcAction.REPO_PROFILE, {
                            action: "save",
                            profileId: this.state.config.selectedProfile
                        });
                    }}>Always use in current repository</button>
                    <button type="button" onClick={() => {
                        const profiles = this.state.config.profiles;
                        profiles.push({
                            profileName: "new profile",
                            authType: "ssh",
                            gitEmail: "",
                            gitName: "",
                            sshAgent: true,
                            gpg: undefined,
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
                        // TODO: Specifik dialog for this?
                        const result = await openNativeDialog(NativeDialog.MESSAGE_BOX, {
                            message: `Delete profile ${selectedProfile.profileName}?`,
                            type: "question",
                            buttons: ["No", "Delete"],
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
                        <input id="terminal-app" type="text" name="terminal-app" value={this.state.config.terminal || ""} onInput={e => this.setConfig("terminal", e.currentTarget.value)} />
                    </div>
                </div>
                <div className="pane">
                    <h3>UI</h3>
                    <div>
                        <label for="ssh-agent">Refresh workdir on focus:</label>
                        <input id="ssh-agent" type="checkbox" name="ssh-agent" checked={this.state.config.ui.refreshWorkdirOnFocus} onInput={e => this.setUIConfig("refreshWorkdirOnFocus", e.currentTarget.checked)} />
                    </div>
                </div>
                <div className="pane">
                    <h3>Git</h3>
                    <div>
                        <label for="commitlist-sort-order">Commitlist sort order:</label>
                        <select id="commitlist-sort-order" onInput={e => this.setConfig("commitlistSortOrder", e.currentTarget.value as AppConfig["commitlistSortOrder"])}>
                            <option value="topological" selected={this.state.config.commitlistSortOrder === "topological"}>Topological (default)</option>
                            <option value="none" selected={this.state.config.commitlistSortOrder === "none"}>None (Much faster for large repos)</option>
                        </select>
                    </div>
                </div>
                {this.state.saved && <p>Settings saved!</p>}
                <button type="button" onClick={this.props.cancelCb}>Close</button>
                <button type="submit">Save</button>
            </Fragment>
        }

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
                    this && this.setState({
                        saved: null
                    });
                }, 5000);
                this.props.confirmCb(this.state.config);
            }}>
                <h2>Settings</h2>
                {formBody}
            </form>
        </div>;
    }
}
