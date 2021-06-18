import { app } from "electron";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { AppConfig } from "../Config";


let appConfig: AppConfig;
let selectedGitProfile: AppConfig["profiles"][0];
const globalAppConfigPath = join(app.getPath("userData"), "git-good.config.json");

try {
    const configJSON = readFileSync(globalAppConfigPath).toString();
    appConfig = JSON.parse(configJSON);
    selectedGitProfile = appConfig.profiles[appConfig.selectedProfile];
} catch (err) {
    console.log("No existing config file. Creating...");
    appConfig = {
        profiles: [
            {
                profileName: "default",
                authType: "ssh",
                gitEmail: "",
                gitName: "",
                sshAgent: true,
                gpg: undefined,
            }
        ],
        selectedProfile: 0
    };
    writeFileSync(globalAppConfigPath, JSON.stringify(appConfig));
}

export function currentProfile() {
    return selectedGitProfile;
}

export function setCurrentProfile(profileId: number) {
    if (appConfig.profiles[profileId]) {
        selectedGitProfile = appConfig.profiles[profileId];
    }
}

export function saveAppConfig(data: AppConfig) {
    appConfig = data;
    writeFileSync(globalAppConfigPath, JSON.stringify(appConfig));
}

export function getAppConfig() {
    return appConfig;
}
