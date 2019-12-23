
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

export function formatPath(path: string){
    //fix path on windows
    return path.replace(/^\/([a-zA-Z]+:\/)/g, "$1");
}

export function intepolatePath(this: void, path: string): string
{
    if(vscode.workspace.workspaceFolders){
        let rootPath = vscode.workspace.workspaceFolders[0];
        path = formatPath((<string>path).replace(/\$\{workspaceRoot\}/g, rootPath.uri.path));
    }
    return path;
}

export function resolveFilePath(this: void, main: string, tsPath: string, currentTsFile: string): string
{
    const interpolatedFilePath: string = intepolatePath(main);
    const resolvedFilePath: string = path.resolve(tsPath, interpolatedFilePath);
    if (resolvedFilePath.indexOf(currentTsFile) >= 0)
    {
        return ''; // avoid infinite loops
    }
    return resolvedFilePath;
}



export function resolveMainFilePaths(this: void, main: string | string[], lessPath: string, currentLessFile: string): string[]
{
    let mainFiles: string[];
    if (typeof main === "string")
    {
        mainFiles = [main];
    }
    else if (Array.isArray(main))
    {
        mainFiles = main;
    }
    else
    {
        mainFiles = [];
    }

    const interpolatedMainFilePaths: string[] = mainFiles.map(mainFile => intepolatePath(mainFile));
    const resolvedMainFilePaths: string[] = interpolatedMainFilePaths.map(mainFile => path.resolve(lessPath, mainFile));
    if (resolvedMainFilePaths.indexOf(currentLessFile) >= 0)
    {
        return []; // avoid infinite loops
    }

    return resolvedMainFilePaths;
}