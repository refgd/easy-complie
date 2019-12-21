
import * as vscode from 'vscode';
import * as path from 'path';
import * as extend from 'extend';



export function getGlobalOptions(filename: string, key: string = 'compile') {
    let filenamePath: path.ParsedPath = path.parse(filename);
    let defaultOptions = {
        plugins: [],
        rootFileInfo: getRootFileInfo(filenamePath),
        relativeUrls: false
    };

    let configuredOptions = vscode.workspace.getConfiguration("easycompile").get(key);
    return extend({}, defaultOptions, configuredOptions);
}

export function getRootFileInfo(parsedPath: path.ParsedPath) {
    parsedPath.ext = ".less";
    parsedPath.base = parsedPath.name + ".less";

    return {
        filename: parsedPath.base,
        currentDirectory: parsedPath.dir,
        relativeUrls: false,
        entryPath: parsedPath.dir + "/",
        rootpath: null,
        rootFilename: null
    }
}

export function getNodeMPath() {
    return path.resolve(__dirname+'/../../node_modules/');
}