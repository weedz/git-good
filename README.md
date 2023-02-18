# git-good
Just a simple git client using electron and nodegit, focus on lightweight and performance

## Build from source

Follow instructions from <https://github.com/nodegit/nodegit>.

### Linux

```
JOBS=max npm_config_openssl_bin_url=skip pnpm run electron-rebuild
pnpm run dist
```

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

Install <https://github.com/Microsoft/vcpkg> (C and C++ package manager for windows), needed for openssl dependency. Then install the `openssl` package with:
```bash
> vcpgk install openssl
```

#### vcpkg

Follow instuctions here, <https://github.com/Microsoft/vcpkg>.

1. Clone to something like `C:\dev\vcpkg`. And run the "bootstrap" script.
2. On windows we need `openssl@1.1.1`. In order to install this with `vcpkg` we need a `vcpkg.json` file. Create the following file in `C:\dev`:
   ```json
   {
        "dependencies": [
            "openssl"
        ],
        "builtin-baseline": "2ac61f87f69f0484b8044f95ab274038fbaf7bdd",
        "overrides": [
            {
                "name": "openssl",
                "version-string": "1.1.1n"
            }
        ]
    }
    ```
    (What is `builtin-baseline`, <https://learn.microsoft.com/en-us/vcpkg/users/examples/versioning.getting-started#builtin-baseline>)
    And run `.\vcpkg\vcpkg.exe install` in `C:\dev`.
3. Make sure to use correct Visual Studio version, <https://github.com/nodejs/node-gyp#on-windows>. Does not build with msvs2022. Need msvs2019: `npm config set msvs_version 2019`
4. Seems like the "postinstall" script for `nodegit` will fail on windows. But the `electron-rebuild` script will succeed.

## Start

Install node modules:
```bash
$ pnpm install
```

Then run
```bash
$ pnpm run build
```
to bundle javascript-files and move assets to the `dist/` directory.

Now run
```bash
$ pnpm run dist
```
to compile all the native dependencies etc. You can run this with `CC="ccache gcc" JOBS=max pnpm run dist` (omit `CC="ccache gcc"` if you don't have `ccache` installed) to speed up compile time.
