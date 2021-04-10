export type AppConfig = {
    authType: "ssh" | "userpass"
    username?: string
    password?: string
    gitEmail: string
    gitName: string
    sshPrivateKey?: string
    sshPublicKey?: string
    sshAgent: boolean
    useGPG: boolean
};
