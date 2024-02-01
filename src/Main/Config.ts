import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { app } from "electron";
import type { Repository } from "nodegit";
import nodegit from "nodegit";
import type { AppConfig, AuthConfig, Profile } from "../Common/Config.js";


let appConfig: AppConfig;
let selectedGitProfile: Profile;
const appDataDir = app.getPath("userData");
const globalAppConfigPath = join(appDataDir, "git-good.config.json");

try {
    const configJSON = readFileSync(globalAppConfigPath).toString();
    appConfig = JSON.parse(configJSON);
    if (!appConfig.diffOptions) {
        appConfig.diffOptions = {
            ignoreWhitespace: true,
        };
    }
    selectedGitProfile = appConfig.profiles[appConfig.selectedProfile];
} catch (err) {
    console.log("Invalid or missing config file. Creating...");
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
        },
        commitlistSortOrder: "topological",
        terminal: null,
        diffOptions: {
            ignoreWhitespace: true,
        },
    };
    writeFileSync(globalAppConfigPath, JSON.stringify(appConfig));
}

let recentRepoMenu: string[] = [];
try {
    const recentRepos = readFileSync(join(appDataDir, "recent-repos.json")).toString();
    recentRepoMenu = JSON.parse(recentRepos);
} catch (err) {
    // noop.
    console.warn("Failed to load recent-repos.json:", err);
}


export function currentProfile() {
    return selectedGitProfile as Readonly<Profile>;
}
export function signatureFromProfile(profile: Profile) {
    return nodegit.Signature.now(profile.gitName, profile.gitEmail);

}
export function signatureFromActiveProfile() {
    return signatureFromProfile(selectedGitProfile);
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
        return currentProfile();
    }
    return null;
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
    return recentRepoMenu as Readonly<typeof recentRepoMenu>;
}
export function addRecentRepository(repoPath: string) {
    // Ensure we do not save duplicates
    const existingIndex = recentRepoMenu.findIndex(itemPath => itemPath === repoPath);
    if (existingIndex > -1) {
        recentRepoMenu.splice(existingIndex, 1);
    }
    recentRepoMenu.unshift(repoPath);
    recentRepoMenu.splice(20);
    
    writeFileSync(join(appDataDir, "recent-repos.json"), JSON.stringify(recentRepoMenu));
    
    return true;
}

export function saveAppConfig(data: AppConfig) {
    appConfig = data;
    writeFileSync(globalAppConfigPath, JSON.stringify(appConfig));
}

export function getAppConfig() {
    return appConfig as Readonly<AppConfig>;
}

export function diffOptionsIsEqual(diffOptions: AppConfig["diffOptions"]) {
    return diffOptions.ignoreWhitespace === appConfig.diffOptions.ignoreWhitespace;
}
