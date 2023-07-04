import { execSync } from "node:child_process";
import { analyzeMetafile } from "esbuild";
import esbuild from "esbuild";

/** @type {import("esbuild").Plugin} */
const envPlugin = {
    name: "env",
    setup(build) {
        // Intercept import paths called "env" so esbuild doesn't attempt
        // to map them to a file system location. Tag them with the "env-ns"
        // namespace to reserve them for this plugin.
        build.onResolve({ filter: /^env$/ }, args => ({
            path: args.path,
            namespace: "env-ns",
        }))
        
        // Load paths tagged with the "env-ns" namespace and behave as if
        // they point to a JSON file containing the environment variables.
        build.onLoad({ filter: /.*/, namespace: "env-ns" }, () => ({
            contents: JSON.stringify({
                buildDateTime: Date.now(),
                lastCommit: execSync("git rev-parse HEAD").toString("utf8").trim(),
            }),
            loader: "json",
        }))
    },
}

const production = process.env.NODE_ENV !== "development";

const plugins = [
    envPlugin,
];

if (!production) {
    /** @type {import("esbuild").Plugin} */
    const watchPlugin = {
        name: 'watch-plugin',
        setup(build) {
            build.onStart(() => {
                console.log("building...");
            });
            build.onEnd(result => {
                console.log("Errors:", result.errors)
                console.log("Warnings:", result.warnings);
            });
        },
    };
    plugins.push(watchPlugin);
}

const ctx = await esbuild.context({
    entryPoints: {
        main: "src/main.ts",
        preload: "src/preload.ts",
        renderer: "src/renderer.tsx",
    },
    metafile: true,
    bundle: true,
    platform: "node",
    target: "esnext",
    external: [
        "nodegit",
        "electron",
        "electron/main",
        "electron/renderer",
    ],
    outdir: "dist",
    plugins,
    minify: production,
    sourcemap: !production,
});


if (!production) {
    await ctx.watch();
} else {
    const result = await ctx.rebuild();
    if (result.metafile) {
        const analyzeLog = await analyzeMetafile(result.metafile);
        // await fs.writeFile("./metafile.json", JSON.stringify(result.metafile));
        console.log(analyzeLog);
    }
    ctx.dispose();
}
