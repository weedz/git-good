import resolve from '@rollup/plugin-node-resolve';
import typescript from "@rollup/plugin-typescript";
import babel from "@rollup/plugin-babel";
import postcss from "rollup-plugin-postcss";
import { terser } from 'rollup-plugin-terser';

const production = !process.env.ROLLUP_WATCH;

const extensions = [".tsx", ".ts"];

export default {
    external: [
        "nodegit",
        "path",
        "fs",
        "electron",
    ],
    input: ["src/renderer.tsx", "src/index.ts"],
    output: {
        sourcemap: !production,
        format: "cjs",
        dir: "dist",
    },
    plugins: [
        typescript(),
        resolve({
            extensions
        }),
        babel({
            babelHelpers: "bundled",
            extensions,
            plugins: [
                [
                    "@babel/plugin-transform-typescript",
                    {
                        jsxPragma: "h",
                        isTSX: true
                    }
                ],
                [
                    "@babel/plugin-transform-react-jsx",
                    {
                        pragma: "h"
                    }
                ],
                "@babel/plugin-proposal-optional-chaining"
            ]
        }),
        postcss(),
        production && terser()
    ],
    watch: {
        clearScreen: false
    }
};
