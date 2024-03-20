'use strict';

const path = require('path');
const cp = require('child_process');
const fs = require('fs-plus');

function getEntry() {
  const entry = {};
  fs.removeSync('out/node_modules');
  const npmListRes = cp.execSync('npm list -only prod -json', {
    encoding: 'utf8'
  });
  const mod = JSON.parse(npmListRes);
  const unbundledModule = {
    'impor': ['out/index.js'], 
    'typescript':['lib'], 
    'sass.js':['dist/sass.sync.js'], 
    'uglify-js':['tools', 'lib'], 
    '@swc/cli':['lib'], 
    '@swc/core':[''], 
    '@swc/types':[''], 
    '@swc/core-linux-x64-gnu':[''], 
    '@swc/core-linux-x64-musl':[''], 
    '@swc/core-win32-x64-msvc':['']
  };
  for (const mod in unbundledModule) {
    unbundledModule[mod].push('package.json');
    for (const sub of unbundledModule[mod]) {
      const p = mod + '/' + sub;
      if(fs.isDirectorySync('node_modules/' + p)){
        fs.copySync('node_modules/' + p, 'out/node_modules/' + p)
      }else{
        fs.copyFileSync('node_modules/' + p, 'out/node_modules/' + p)
      }
    }
  }
  
  const list = getDependeciesFromNpm(mod);
  const moduleList = list.filter((value, index, self) => {
    return self.indexOf(value) === index && !unbundledModule[value] && !/^@types\//.test(value);
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