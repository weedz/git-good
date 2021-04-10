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
$ npm run dist
```
to compile all the native dependencies etc. You can run this with `CC="ccache gcc" JOBS=max npm run dist` (omit `CC="ccache gcc"` if you don't have `ccache` installed) to speed up compile time.

## Git Auth

### GitHub

https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token

For personal access token, set Auth type to "Username/password" and:

* `username = [ACCESS_TOKEN]`
* `password = x-oauth-basic`

### GitLab

https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html

For personal access token, set Auth type to "Username/password" and:

* `username = [USERNAME]`
* `password = [ACCESS_TOKEN]`
