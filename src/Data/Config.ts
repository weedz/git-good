export type AppConfig = {
    profiles: Array<{
        profileName: string
        authType: "ssh" | "userpass"
        username?: string
        password?: string
        gitEmail: string
        gitName: string
        sshPrivateKey?: string
        sshPublicKey?: string
        sshAgent: boolean
        gpg?: GpgConfig
    }>
    selectedProfile: number
};

export type GpgConfig = {
    commit: boolean
    tag: boolean
    key: string
    executable: string
}
