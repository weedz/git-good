# git-good
Just a simple git client using electron and nodegit, focus on lightweight and performance

## Build from source

Follow instructions from https://github.com/nodegit/nodegit. 

### Arch Linux

PKGBUILD is available from <https://github.com/weedz/git-good-pkgbuild>. 

### Ubuntu/debian

To successfully build/link nodegit on linux you will need the following packages:
```
build-essential
libssh-dev
libkrb5-dev
```

### Windows

Install https://github.com/Microsoft/vcpkg (C and C++ package manager for windows), needed for openssl dependency. Then install the `openssl` package with:
```bash
> vcpgk install openssl
```

## Start

Install node modules:
```bash
$ npm install
```

Then run
```bash
$ npm run build
```
to bundle javascript-files and move assets to the `dist/` directory.

Now run
```bash
$ npm run dist
```
to compile all the native dependencies etc. You can run this with `CC="ccache gcc" JOBS=max npm run dist` (omit `CC="ccache gcc"` if you don't have `ccache` installed) to speed up compile time.
