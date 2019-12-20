import * as ts from "typescript"
import * as mkpath from 'mkpath'
import * as path from 'path'
import * as extend from 'extend'
import * as fs from 'fs'
import * as vscode from 'vscode';

import * as Configuration from "../../Configuration";
import * as FileOptionsParser from "../../FileOptionsParser";
import {MinifyJsCommand} from "../../minify/js/MinifyJsCommand";
import { isArray } from "util"

const DEFAULT_EXT = ".js";

// compile the given ts file
export function compile(tsFile: string, defaults): Promise<any>
{
    return readFilePromise(tsFile).then(buffer =>
    {
        const content: string = buffer.toString();
        const options = FileOptionsParser.parse(content, defaults);
        const tsPath: string = path.dirname(tsFile);

        // main is set: compile the referenced file instead
        if (options.main)
        {
            const mainFilePaths: string[] = resolveMainFilePaths(options.main, tsPath, tsFile);
            if(!options.exclude) options.exclude = [];
            if(options.excludes) options.exclude = extend([], options.exclude, options.excludes);
            const excludePaths: string[] = resolveMainFilePaths(options.exclude, tsPath, tsFile);
            let lastPromise: Promise<any> | null = null;
            if (mainFilePaths && mainFilePaths.length > 0)
            {
                for (const filePath of mainFilePaths)
                {
                    if(filePath.indexOf('*')>-1){
                        const paths = filePath.split('*');
                        const subfiles = getSubFiles(paths[0], paths[1], excludePaths);
                        for (const fileP of subfiles)
                        {
                            lastPromise = compilenext(fileP, defaults, lastPromise);
                        }
                    }else{
                        lastPromise = compilenext(filePath, defaults, lastPromise);
                    }
                }
                return lastPromise;
            }
        }
        
        // out
        if ( typeof options.outfile !== "string"
            && typeof options.outdir !== "string")
        {
            // is null or false: do not compile
            return null;
        }

        const outfile: string | undefined = options.outfile;
        const outdir: string | undefined = options.outdir;
        
        const baseFilename: string = path.parse(tsFile).name;
        const pathToTypes = path.resolve(intepolatePath('${workspaceRoot}/node_modules/@types'));
        let tsOptions:any = {
            noEmitOnError: true, noImplicitAny: false, sourceMap: false,
            allowJs: true, removeComments: true, listEmittedFiles: true,
            target: ts.ScriptTarget.ES5, module: ts.ModuleKind.AMD,
            typeRoots: [pathToTypes]
        }
        tsOptions = extend({}, tsOptions, options);
        if (typeof outfile === "string") 
        {
            tsOptions = extend({}, tsOptions, {outFile: resolveFilePath(outfile, tsPath, tsFile)});
        }
        else if (typeof outdir === "string")
        {
            tsOptions = extend({}, tsOptions, {outDir: resolveFilePath(outdir, tsPath, tsFile)});
        }
        
        if(isArray(tsOptions.lib)){
            tsOptions.lib.forEach((o, i, a) => o.indexOf('.d.')>-1?null:a[i]="lib."+o+".d.ts");
        }
        // ts.sys.getExecutingFilePath = function(){
        //     return path.resolve(__dirname, '../node_modules/typescript/lib/lib.d.s');
        // }
        
        let program = ts.createProgram([tsFile], tsOptions);
        let emitResult = program.emit();

        let allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
        let alld: Array<object> = [];

        allDiagnostics.forEach(diagnostic => {
            if(diagnostic.file){
                let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
                let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
                alld.push({
                    lineIndex: line,
                    column: character,
                    message: message
                });
            }
        });
        
        if( (alld === null || alld.length==0) && options.compress && emitResult.emittedFiles){
            emitResult.emittedFiles.forEach(file => {
                let minifyLib = new MinifyJsCommand(false, false, file);
                minifyLib.execute();
            });
        }

        return returnPromise(alld);
    });
}

function returnPromise(obj:any): Promise<any>
{
    return new Promise((resolve, reject) =>
    {
        resolve(obj);
    });
}

function intepolatePath(this: void, path: string): string
{
    if(vscode.workspace.workspaceFolders){
        let rootPath = vscode.workspace.workspaceFolders[0];
        return (<string>path).replace(/\$\{workspaceRoot\}/g, rootPath.uri.path);
    }
    return path;
}

function resolveFilePath(this: void, main: string, tsPath: string, currentTsFile: string): string
{
    const interpolatedFilePath: string = intepolatePath(main);
    const resolvedFilePath: string = path.resolve(tsPath, interpolatedFilePath);
    if (resolvedFilePath.indexOf(currentTsFile) >= 0)
    {
        return ''; // avoid infinite loops
    }
    return resolvedFilePath;
}

function resolveMainFilePaths(this: void, main: string | string[], tsPath: string, currentTsFile: string): string[]
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
    const resolvedMainFilePaths: string[] = interpolatedMainFilePaths.map(mainFile => path.resolve(tsPath, mainFile));
    if (resolvedMainFilePaths.indexOf(currentTsFile) >= 0)
    {
        return []; // avoid infinite loops
    }

    return resolvedMainFilePaths;
}

function readFilePromise(this: void, filename: string): Promise<Buffer> 
{
    return new Promise((resolve, reject) =>
    {
        fs.readFile(filename, (err: any, buffer: Buffer) =>
        {
            if (err) 
            {
                reject(err)
            }
            else
            {
                resolve(buffer);
            }
        });
    });
}

function getSubFiles(parent, file, excludePaths){
    let dirList = fs.readdirSync(parent);
    let paths:string[] = [];
    if(dirList){
        dirList.forEach(function(item){
            let p = path.join(parent, item);
            if(excludePaths.indexOf(p)<0){
                p = path.join(p, file);
                if(fs.existsSync(p)){
                    paths.push(p);
                }
            }
        });
    }
    return paths;
}

function promiseChainer(lastPromise: Promise<void>, nextPromise: Promise<void>): Promise<any>{
    lastPromise.then(() => nextPromise);
    return nextPromise;
}

function compilenext(filePath, defaults, lastPromise): Promise<any>{
    const mainPath: path.ParsedPath = path.parse(filePath);
    const mainRootFileInfo = Configuration.getRootFileInfo(mainPath);
    const mainDefaults = extend({}, defaults, { rootFileInfo: mainRootFileInfo });
    const compilePromise = compile(filePath, mainDefaults);
    if (lastPromise)
    {
        lastPromise = promiseChainer(lastPromise, compilePromise);
    }
    else
    {
        lastPromise = compilePromise;
    }
    return lastPromise;
}