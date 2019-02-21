#!/usr/bin/env bash
set -e # fail on first error
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/.." # root dir
cd "${DIR}"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "${BRANCH}" != "master" ]; then echo "Error: Branch must be master" && exit 1; fi

npm version -i
npm run conventional-github-releaser -p angular
npm publish