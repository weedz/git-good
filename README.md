# git-good
Just a simple git client using electron and nodegit, focus on lightweight and performance

## Build from source

Follow instructions from https://github.com/nodegit/nodegit. 

### Linux (Ubuntu)

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
$ npm run start:forge
```
to have `electron-forge` compile all the native dependencies etc. The app should launch in a few moments.
