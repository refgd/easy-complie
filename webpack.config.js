'use strict';

const path = require('path');
const cp = require('child_process');
const fs = require('fs-plus');

function getEntry() {
  const entry = {};
  const npmListRes = cp.execSync('npm list -only prod -json', {
    encoding: 'utf8'
  });
  const mod = JSON.parse(npmListRes);
  const unbundledModule = ['impor', 'typescript', 'less', 'sass.js', 'uglify-js', 'less-plugin-sass2less'];
  for (const mod of unbundledModule) {
    const p = 'node_modules/' + mod;
    fs.copySync(p, 'out/node_modules/' + mod);
  }
  const list = getDependeciesFromNpm(mod);
  const moduleList = list.filter((value, index, self) => {
    return self.indexOf(value) === index && unbundledModule.indexOf(value) === -1 && !/^@types\//.test(value);
  });

  for (const mod of moduleList) {
    if(mod!='commander') entry[mod] = './node_modules/' + mod;
  }

  return entry;
}

function getDependeciesFromNpm(mod) {
  let list = [];
  const deps = mod.dependencies;
  if (!deps) {
    return list;
  }
  for (const m of Object.keys(deps)) {
    list.push(m);
    list = list.concat(getDependeciesFromNpm(deps[m]));
  }
  return list;
}

/**@type {import('webpack').Configuration}*/
const config = {
    target: 'node',
    node: {
      __dirname: false,
      __filename: false,
    },
    entry: getEntry(),
    output: {
        path: path.resolve(__dirname, 'out/node_modules'),
        filename: '[name].js',
        libraryTarget: "commonjs2",
        devtoolModuleFilenameTemplate: "../[resource-path]",
    },
    externals: {
        vscode: "commonjs vscode",
        commander: "commonjs commander"
    },
    resolve: {
        extensions: ['.js', '.json']
    }
}

module.exports = config;