#!/bin/bash

set -eux -o pipefail

# # Electron's version.
# export npm_config_target=35.2.0
# # The architecture of your machine
# export npm_config_arch=x64
# export npm_config_target_arch=x64
# # Download headers for Electron.
# export npm_config_disturl=https://electronjs.org/headers
# # Tell node-pre-gyp that we are building for Electron.
# export npm_config_runtime=electron
# # Tell node-pre-gyp to build module from source code.
# export npm_config_build_from_source=true
# # Install all dependencies, and store cache to ~/.electron-gyp.
# HOME=~/.electron-gyp JOBS=max pnpm install

export ELECTRON_VERSION=36.7.0

cd node_modules/nodegit && HOME=~/.electron-gyp JOBS=max ./node_modules/.bin/node-gyp rebuild --target=${ELECTRON_VERSION} --arch=x64 --dist-url=https://electronjs.org/headers
