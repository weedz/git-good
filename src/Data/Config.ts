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
        useGPG: boolean
    }>
    selectedProfile: number
};
