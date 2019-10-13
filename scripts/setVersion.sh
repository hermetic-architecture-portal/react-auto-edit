#!/usr/bin/env bash
this_dir=`pwd`
scripts_dir=`dirname $0`
npm version $1 --no-git-tag-version
node "${scripts_dir}/setDepVersion.js" $1 "${this_dir}/examples/basic"
node "${scripts_dir}/setDepVersion.js" $1 "${this_dir}/examples/customisation"
cd examples/basic
npm version $1 --no-git-tag-version
cd ../customisation
npm version $1 --no-git-tag-version