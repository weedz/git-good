import { execSync } from "child_process";

import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import css from "rollup-plugin-import-css";
import replace from "@rollup/plugin-replace"
import { defineConfig } from "rollup";
import { minify } from "terser";

function terserPlugin() {
    return {
        async renderChunk(code, _chunk, outputOptions) {
            const options = {
                mangle: true,
                compress: true,
                sourceMap: outputOptions.sourcemap,
            };
            if (outputOptions.format === "es" || outputOptions.format === "esm") {
                options.module = true;
            }
            if (outputOptions.format === "cjs") {
                options.toplevel = true;
            }

            return minify(code, options);
        }
    }
}


const production = !process.env.ROLLUP_WATCH;

const extensions = [".tsx", ".ts"];

const external = [
    "nodegit",
    "path",
    "fs",
    "fs/promises",
    "child_process",
    "electron",
    "@electron/remote",
    "@electron/remote/main",
];

const plugins = [
    typescript(),
    resolve({
        extensions
    }),
    css({
        output: "style.css",
        minify: production
    }),
    replace({
        preventAssignment: true,
        __build_date__: () => new Date().getTime(),
        __last_comit__: () => execSync("git rev-parse HEAD").toString("utf8").trim(),
    }),
    production && terserPlugin(),
];

export default defineConfig({
    external,
    input: [
        "src/renderer.tsx",
        "src/main.ts"
    ],
    output: {
        sourcemap: !production,
        format: "cjs",
        dir: "dist",
        compact: production,
    },
    plugins,
    watch: {
        clearScreen: false
    }
});
