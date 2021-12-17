type SshConfig = {
    authType: "ssh"
} &
(
    {
        sshAgent: true
    } | {
        sshAgent: false
        sshPrivateKey: string
        sshPublicKey: string
        sshPassphrase?: string
    }
);

export type AuthConfig = SshConfig | {
    authType: "userpass"
    username: string
    password: string
};

export type Profile = {
    profileName: string
    authType: "ssh" | "userpass"
    username?: string
    password?: string
    gitEmail: string
    gitName: string
    sshPrivateKey?: string
    sshPublicKey?: string
    sshPassphrase?: string
    sshAgent: boolean
    gpg?: GpgConfig | undefined
}

export interface AppConfig {
    profiles: Profile[]
    selectedProfile: number
    ui: {
        refreshWorkdirOnFocus: boolean
    }
    commitlistSortOrder: "topological" | "none"
    terminal: string | null
}

export interface GpgConfig {
    commit: boolean
    tag: boolean
    key: string
    executable: string
}
