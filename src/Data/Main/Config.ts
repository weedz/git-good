import { app } from "electron";
import { readFileSync, unlinkSync, writeFileSync } from "fs";
import { readFile } from "fs/promises";
import { Repository } from "nodegit";
import { join } from "path";
import { AppConfig, AuthConfig } from "../Config";


let appConfig: AppConfig;
let selectedGitProfile: AppConfig["profiles"][0];
const appDataDir = app.getPath("userData");
const globalAppConfigPath = join(appDataDir, "git-good.config.json");

try {
    const configJSON = readFileSync(globalAppConfigPath).toString();
    appConfig = JSON.parse(configJSON);
    selectedGitProfile = appConfig.profiles[appConfig.selectedProfile];
} catch (err) {
    console.log("Invalid or not existing config file. Creating...");
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
        selectedProfile: 0,
        ui: {
            refreshWorkdirOnFocus: false
        }
    };
    writeFileSync(globalAppConfigPath, JSON.stringify(appConfig));
}

let recentRepoMenu: string[] = [];
try {
    const recentRepos = readFileSync(join(appDataDir, "recent-repos.json")).toString();
    recentRepoMenu = JSON.parse(recentRepos);
} catch (err) {
    // noop.
}


export function currentProfile() {
    return selectedGitProfile;
}

export function getAuth(): AuthConfig | false {
    const profile = currentProfile();
    if (profile.authType === "ssh") {
        if (profile.sshAgent) {
            return {
                sshAgent: profile.sshAgent,
                authType: profile.authType,
            }
        }
        return {
            sshAgent: false,
            authType: profile.authType,
            sshPublicKey: profile.sshPublicKey as string,
            sshPrivateKey: profile.sshPrivateKey as string,
            sshPassphrase: profile.sshPassphrase || "",
        }
    }
    if (profile.username && profile.password) {
        return {
            authType: profile.authType,
            username: profile.username,
            password: profile.password,
        }
    }
    return false;
}


export function setCurrentProfile(profileId: number) {
    if (appConfig.profiles[profileId]) {
        selectedGitProfile = appConfig.profiles[profileId];
        appConfig.selectedProfile = profileId;
        return selectedGitProfile;
    }
}

export function setRepoProfile(repo: Repository, profileId: number) {
    if (!appConfig.profiles[profileId]) {
        return false;
    }

    writeFileSync(join(repo.path(), "git-good.profile"), profileId.toString(10));

    return true;
}
export async function getRepoProfile(repo: Repository) {
    try {
        const repoProfile = await readFile(join(repo.path(), "git-good.profile"));
        const profileId = parseInt(repoProfile.toString("utf8").trim(), 10);
        if (appConfig.profiles[profileId]) {
            return profileId;
        }
    } catch (e) {
        // noop
    }
    return false;
}

export function clearRepoProfile(repo: Repository) {
    unlinkSync(join(repo.path(), "git-good.profile"));
}


export function getRecentRepositories() {
    return recentRepoMenu;
}
export function addRecentRepository(repoPath: string) {
    // Ensure we do not save duplicates
    const existingIndex = recentRepoMenu.findIndex(itemPath => itemPath === repoPath);
    if (existingIndex > -1) {
        recentRepoMenu.splice(existingIndex, 1);
    }
    recentRepoMenu.unshift(repoPath);
    recentRepoMenu.splice(10);
    
    writeFileSync(join(appDataDir, "recent-repos.json"), JSON.stringify(recentRepoMenu));
    
    return true;
}

export function saveAppConfig(data: AppConfig) {
    appConfig = data;
    writeFileSync(globalAppConfigPath, JSON.stringify(appConfig));
}

export function getAppConfig() {
    return appConfig;
}
