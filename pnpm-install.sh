#!/usr/bin/env bash
# -x prints the executed command to stdout
set -euo pipefail

update() {
    CXX="ccache g++" CC="ccache gcc" JOBS=max pnpm update
}

install() {
    CXX="ccache g++" CC="ccache gcc" JOBS=max pnpm install
}

while getopts "ui" opt
do
    case $opt in
    u)
        update
        ;;
    i)
        install
        ;;
    esac
done
