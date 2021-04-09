import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import postcss from "rollup-plugin-postcss";
import { terser } from "rollup-plugin-terser";
// import { visualizer } from "rollup-plugin-visualizer";

const production = !process.env.ROLLUP_WATCH;

const extensions = [".tsx", ".ts"];

const external = [
    "nodegit",
    "path",
    "fs",
    "child_process",
    "electron",
    "@electron/remote"
];

const plugins = [
    typescript(),
    resolve({
        extensions
    }),
    postcss({
        minimize: true
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
