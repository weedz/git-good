import process from "node:process";
export const isMac = process.platform === "darwin";
// export const isLinux = process.platform === "linux";
export const isWindows = process.platform === "win32";
