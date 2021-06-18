import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import postcss from "rollup-plugin-postcss";
import { terser } from "rollup-plugin-terser";
// import { visualizer } from "rollup-plugin-visualizer";
import replace from "@rollup/plugin-replace"
import { execSync } from "child_process";

const production = !process.env.ROLLUP_WATCH;

const extensions = [".tsx", ".ts"];

const external = [
    "nodegit",
    "path",
    "fs",
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
    postcss({
        minimize: production
    }),
    replace({
        preventAssignment: true,
        __build_date__: () => new Date().getTime(),
        __last_comit__: () => execSync("git rev-parse HEAD").toString("utf8").trim(),
    }),
    production && terser(),
    // visualizer(),
];

export default {
    external,
    input: ["src/renderer.tsx", "src/index.ts"],
    output: {
        sourcemap: !production,
        format: "cjs",
        dir: "dist",
    },
    plugins,
    watch: {
        clearScreen: false
    }
};
