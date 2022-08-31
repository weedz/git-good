const fs = require("fs");
const asar = require('asar');

let nodegitPathList = [
    "node_modules/nodegit/.github",
    "node_modules/nodegit/vendor",
    "node_modules/nodegit/build/vendor",
    "node_modules/nodegit/include",
    "node_modules/nodegit/lifecycleScripts",
    "node_modules/nodegit/utils",

    "node_modules/nodegit/bin",

    "node_modules/nodegit/.travis",
    "node_modules/nodegit/generate",
    "node_modules/nodegit/guides",

    "node_modules/nodegit/build/Release/git2.a",
    "node_modules/nodegit/build/Release/http_parser.a",
    "node_modules/nodegit/build/Release/ntlmclient.a",
    "node_modules/nodegit/build/Release/pcre.a",
    "node_modules/nodegit/build/Release/ssh2.a",
    "node_modules/nodegit/build/Release/zlib.a",
    "node_modules/nodegit/build/Release/acquireOpenSSL.node",
    "node_modules/nodegit/build/Release/configureLibssh2.node",
];

const fileList = [
    "src",
    "scripts",
    ".github",
    "tsconfig.json",
    ".eslintrc.json",
    ".eslintignore",
    ".preact.eslintrc.js",
    "static",
    "pnpm-lock.yaml",
    "TODO.md",
];


async function clean(resourceDir) {
    // Cleaning app.asar..
    asar.extractAll(`${resourceDir}/app.asar`, `${resourceDir}/app`);
    fs.rmSync(`${resourceDir}/app.asar`);

    for (const dir of nodegitPathList.concat(fileList)) {
        if (fs.existsSync(`${resourceDir}/app/${dir}`)) {
            fs.rmSync(`${resourceDir}/app/${dir}`, { recursive: true });
        } else {
            console.log(`File not found: '${resourceDir}/app/${dir}'`);
        }
    }
    
    await asar.createPackageWithOptions(`${resourceDir}/app`, `${resourceDir}/app.asar`, {
        unpackDir: "**"
    });
    fs.rmSync(`${resourceDir}/app`, { recursive: true });

    for (const dir of nodegitPathList) {
        if (fs.existsSync(`${resourceDir}/app.asar.unpacked/${dir}`)) {
            fs.rmSync(`${resourceDir}/app.asar.unpacked/${dir}`, { recursive: true });
        } else {
            console.log(`File not found: '${resourceDir}/app.asar.unpacked/${dir}'`);
        }
    }
}

function cleanLinux() {
    return clean("out/linux-unpacked/resources");
}
function cleanMac() {
    return clean("out/mac/git-good.app/Contents/Resources");
}

exports.default = async function(packContext) {
    console.log("Removing uneccessary build/dev files...");

    if (packContext.electronPlatformName === "linux") {
        await cleanLinux();
    } else if (packContext.electronPlatformName === "darwin") {
        await cleanMac();
    }
}
