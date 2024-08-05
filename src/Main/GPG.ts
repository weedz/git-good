import { spawn } from "child_process";
import { writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export function gpgSign(key: string, data: string) {
    const gpg = spawn("gpg", ["--batch", "--detach-sign", "--armor", "--sign-with", key, "-o", "-"]);
    return new Promise<string>((resolve, reject) => {
        const buffers: Buffer[] = [];
        let buffersLength = 0;
        let error = "";

        gpg.stdout.on("data", (buf: Buffer) => {
            buffers.push(buf);
            buffersLength += buf.length;
        });

        gpg.stderr.on("data", (buf: Buffer) => {
            error += buf.toString("utf8");
        });

        gpg.on("error", err => {
            reject(err);
        });
        gpg.on("close", code => {
            if (code !== 0) {
                return reject(error);
            }
            const signature = Buffer.concat(buffers, buffersLength).toString("utf-8");
            resolve(signature);
        });
        gpg.stdin.end(data);
    });
}

export function gpgVerify(signature: string, data: string) {
    const signaturePath = join(tmpdir(), "./signature.asc");

    writeFileSync(signaturePath, signature);

    const gpg = spawn("gpg", ["--logger-fd", "1", "--verify", signaturePath, "-"]);
    return new Promise<{ data: string, verified: boolean }>((resolve, reject) => {
        const buffers: Buffer[] = [];
        let buffersLength = 0;

        gpg.stdout.on("data", (buf: Buffer) => {
            buffers.push(buf);
            buffersLength += buf.length;
        });

        gpg.on("error", err => {
            reject(err);
        });
        gpg.on("close", code => {
            const result = Buffer.concat(buffers, buffersLength).toString("utf-8");
            resolve({
                data: result,
                verified: code === 0
            });
        });
        gpg.stdin.end(data);
    });
}
