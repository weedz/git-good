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
            "node_modules/nodegit/(vendor|include)"
        ]
    },
    makers: [
        {
            name: "@electron-forge/maker-squirrel",
            confi: {
                name: "git_good"
            }
        },
        {
            name: "@electron-forge/maker-zip",
            platforms: [
                "darwin"
            ]
        },
        {
            name: "@electron-forge/maker-deb",
            config: {}
        }
    ]
}
