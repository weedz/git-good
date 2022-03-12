const fs = require("fs");
const path = require("path");
const rollup = require("rollup");
const loadConfigFile = require("rollup/dist/loadConfigFile.js");

(async () => {
    const distDir = path.resolve("dist");
    if (fs.existsSync(distDir)) {
        fs.rmSync(distDir, { recursive: true });
    }
    fs.mkdirSync(distDir);
    fs.copyFileSync(path.resolve("static/index.html"), path.join(distDir, "index.html"));
    
    const rollupConfig = await loadConfigFile(path.resolve("rollup.config.js"));

    // "warnings" wraps the default `onwarn` handler passed by the CLI.
    // This prints all warnings up to this point:
    console.log(`We currently have ${rollupConfig.warnings.count} warnings`);

    // This prints all deferred warnings
    rollupConfig.warnings.flush();

    // options is an array of "inputOptions" objects with an additional "output"
    // property that contains an array of "outputOptions".
    // The following will generate all outputs for all inputs, and write them to disk the same
    // way the CLI does it:
    for (const optionsObj of rollupConfig.options) {
        const bundle = await rollup.rollup(optionsObj);
        await Promise.all(optionsObj.output.map(bundle.write));
        await bundle.close();
    }
})();

