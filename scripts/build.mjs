import { existsSync, rmSync, mkdirSync, copyFileSync } from "fs";
import { resolve, join } from "path";
import { execSync } from "child_process";

import { build } from "esbuild";

const production = process.env.NODE_ENV !== "development";

const distDir = resolve("dist");
if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true });
}
mkdirSync(distDir);
copyFileSync(resolve("static/index.html"), join(distDir, "index.html"));

const buildTimestamp = new Date().getTime();
const lastCommit = execSync("git rev-parse HEAD").toString("utf8").trim();

const result = await build({
    write: true,
    entryPoints: [resolve("src/index.ts"), resolve("src/renderer.tsx")],
    outdir: "dist",
    plugins: [
        {
            name: 'env',
            setup(build) {
                // Intercept import paths called "env" so esbuild doesn't attempt
                // to map them to a file system location. Tag them with the "env-ns"
                // namespace to reserve them for this plugin.
                build.onResolve({ filter: /^build-env$/ }, args => ({
                    path: args.path,
                    namespace: 'build-env-ns',
                }))
                
                // Load paths tagged with the "env-ns" namespace and behave as if
                // they point to a JSON file containing the environment variables.
                build.onLoad({ filter: /.*/, namespace: 'build-env-ns' }, () => {
                    return {
                        contents: JSON.stringify({
                            buildTimestamp,
                            lastCommit,
                        }),
                        loader: 'json',
                    }
                })
            },
        },
    ],
    bundle: true,
    minify: production,
    watch: !production ? {
        onRebuild(error, result) {
            if (error) {
                console.error('watch build failed:', error);
            } else {
                console.log('watch build succeeded:', result)
            }
        }
    } : false,
    platform: "node",
    external: ["electron", "nodegit", "@electron/remote"],
}); 

console.log(result);

if (result.outputFiles) {
    for (const file of result.outputFiles) {
        console.log(`${file.path}, ${file.contents.byteLength}`);
    }
}
