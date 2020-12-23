module.exports = {
    plugins: [
        ["@electron-forge/plugin-auto-unpack-natives"]
    ],
    packagerConfig: {
        asar: true,
        prune: true,
        ignore: [
            "/src",
            "/static",
            "package-lock.json",
            "tsconfig.json",
            "rollup.config.js",
            "forge.config.js",
            ".eslintrc.json",
            ".gitignore",
            "node_modules/nodegit/(vendor|include)",
            "/types",
        ]
    },
    makers: [
        {
            name: "@electron-forge/maker-squirrel",
            config: {
                name: "git_good"
            }
        },
        {
            name: "@electron-forge/maker-zip"
        },
        {
            name: "@electron-forge/maker-deb",
            config: {
                options: {
                    homepage: "https://github.com/weedz/git-good"
                }
            }
        }
    ]
}
