#!/usr/bin/env bash

set -ex

cd "$(dirname $0)/../src/test/data"

BAB_TAG=v$(node -p 'require("@babel/parser/package.json").version')

if [ ! -d babel-parser ]
then
    git clone --branch "$BAB_TAG" --depth 1 \
        https://github.com/babel/babel.git
    mv babel/packages/babel-parser .
    rm -rf babel
fi

TS_TAG=v$(node -p 'require("typescript/package.json").version')

if [ ! -d typescript-compiler ]
then
    git clone --branch "$TS_TAG" --depth 1 \
        https://github.com/Microsoft/TypeScript.git
    mv TypeScript/src/compiler typescript-compiler
    rm -rf TypeScript
fi

cd ../../.. # back to the ast-types/ root directory

# Run Mocha on the generated .js code, rather than the .ts source code, so
# that we're testing the same kind of output that we're shipping to npm.
exec mocha --reporter spec --full-trace $@ lib/test/run.js
