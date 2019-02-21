#!/usr/bin/env bash
set -e # fail on first error
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/../.." # root dir
cd "${DIR}"


node -e "const pkgo = require('./package.json'); pkgo.version=pkgo.version.replace(/\\.b[0-9]+$/ui, '') + '.b' + Date.now();require('fs').writeFileSync('./package.json', JSON.stringify(pkgo, undefined, 2), 'UTF-8');"