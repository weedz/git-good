import { execSync } from "child_process";

import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import css from "rollup-plugin-import-css";
import { terser } from "rollup-plugin-terser";
import replace from "@rollup/plugin-replace"

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
    production && terser(),
];

export default {
    external,
    input: [
        "src/renderer.tsx",
        "src/main.ts"
    ],
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
