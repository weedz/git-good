import { analyzeMetafile } from "esbuild";
import esbuild from "esbuild";
import { execSync } from "node:child_process";

process.env.NODE_ENV ||= "production";
const production = process.env.NODE_ENV !== "development";

const lastCommit = (() => {
  try {
    return execSync("git rev-parse HEAD").toString("utf8").trim();
  } catch (_err) {
    console.log("Not in a git respository. Setting 'lastCommit' to undefined.");
    return "undefined";
  }
})();
const buildDateTime = Date.now();

/** @type {import("esbuild").Plugin[]} */
const plugins = [
  {
    name: "env",
    setup(build) {
      // Intercept import paths called "env" so esbuild doesn't attempt
      // to map them to a file system location. Tag them with the "env-ns"
      // namespace to reserve them for this plugin.
      build.onResolve({ filter: /^env$/ }, (args) => ({
        path: args.path,
        namespace: "env-ns",
      }));

      // Load paths tagged with the "env-ns" namespace and behave as if
      // they point to a JSON file containing the environment variables.
      build.onLoad({ filter: /.*/, namespace: "env-ns" }, () => ({
        contents: JSON.stringify({
          buildDateTime,
          lastCommit,
        }),
        loader: "json",
      }));
    },
  },
];

if (!production) {
  /** @type {import("esbuild").Plugin} */
  const watchPlugin = {
    name: "watch-plugin",
    setup(build) {
      const buildName = Array.isArray(build.initialOptions.entryPoints)
        ? build.initialOptions.entryPoints
            .map((value) => (typeof value === "string" ? value : value.in))
            .join(",")
        : Object.keys(build.initialOptions.entryPoints).join(",");
      build.onStart(() => {
        console.log(`[${buildName}] building...`);
      });
      build.onEnd(async (result) => {
        // const analyzeLog = await analyzeMetafile(result.metafile);
        // console.log(analyzeLog);
        if (result.warnings.length === 0 && result.errors.length === 0) {
          console.log(`[${buildName}] OK`);
        } else {
          console.log(`[${buildName}] Errors:`, result.errors);
          console.log(`[${buildName}] Warnings:`, result.warnings);
        }
      });
    },
  };
  plugins.push(watchPlugin);
}

/** @type {import("esbuild").BuildOptions} */
const commonOptions = {
  metafile: true,
  bundle: true,
  format: "esm",
  platform: "node",
  target: "esnext",
  external: ["nodegit", "electron", "electron/main", "electron/renderer"],
  outdir: "dist",
  plugins,
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
  },
  minify: production,
  sourcemap: !production,
};

await Promise.all([
  esbuild.context({
    ...commonOptions,
    platform: "node",
    entryPoints: {
      main: "src/main.ts",
    },
  }),
  esbuild.context({
    ...commonOptions,
    platform: "browser",
    entryPoints: {
      renderer: "src/renderer.tsx",
    },
    format: "esm",
  }),
  // NOTE: This assumes we do not need to watch/rebuild the preload script
  esbuild.context({
    ...commonOptions,
    entryPoints: {
      preload: "src/preload.ts",
    },
    // NOTE: Sandboxed preload scripts can't use ESM, <https://www.electronjs.org/docs/latest/tutorial/esm#preload-scripts>
    format: "cjs",
  }),
]).then(async (builds) => {
  if (production) {
    const results = await Promise.all(builds.map((build) => build.rebuild()));
    await Promise.all(builds.map((build) => build.dispose()));

    await Promise.all(
      results.map((result) =>
        analyzeMetafile(result.metafile).then((meta) => {
          console.log(meta);
        }),
      ),
    );
  } else {
    await Promise.all(builds.map((build) => build.watch()));
  }
});
