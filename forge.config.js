module.exports = {
    "packagerConfig": {
        "asar": {
            "unpack": "*.node"
        },
        "ignore": [
            "/src/",
            "/static/",
            "package-lock.json",
            "tsconfig.json",
            "rollup.config.js",
            "forge.config.js",
            ".eslintrc.json",
            ".gitignore"
        ]
    },
    "makers": [
        {
            "name": "@electron-forge/maker-squirrel",
            "config": {
                "name": "my_new_app"
            }
        },
        {
            "name": "@electron-forge/maker-zip",
            "platforms": [
                "darwin"
            ]
        },
        {
            "name": "@electron-forge/maker-deb",
            "config": {}
        }
    ]
}
