import * as ts from "typescript"
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
            const mainFilePaths: string[] = Configuration.resolveMainFilePaths(options.main, tsPath, tsFile);
            if(!options.exclude) options.exclude = [];
            if(options.excludes) options.exclude = extend([], options.exclude, options.excludes);
            const excludePaths: string[] = Configuration.resolveMainFilePaths(options.exclude, tsPath, tsFile);
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
        const pathToTypes = path.resolve(Configuration.intepolatePath('${workspaceRoot}/node_modules/@types'));
        let tsOptions:any = {
            noEmitOnError: true, noImplicitAny: false, sourceMap: false,
            allowJs: true, removeComments: true, listEmittedFiles: true,
            target: ts.ScriptTarget.ES5, module: ts.ModuleKind.AMD,
            typeRoots: [pathToTypes]
        }
        tsOptions = extend({}, tsOptions, options);
        if (typeof outfile === "string") 
        {
            tsOptions = extend({}, tsOptions, {outFile: Configuration.resolveFilePath(outfile, tsPath, tsFile)});
        }
        else if (typeof outdir === "string")
        {
            tsOptions = extend({}, tsOptions, {outDir: Configuration.resolveFilePath(outdir, tsPath, tsFile)});
        }
        
        if(isArray(tsOptions.lib)){
            tsOptions.lib.forEach((o, i, a) => o.indexOf('.d.')>-1?null:a[i]="lib."+o+".d.ts");
        }
        
        let program = ts.createProgram([tsFile], tsOptions);
        let emitResult = program.emit();

        let allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
        let alld: Array<object> = [];

        allDiagnostics.forEach(diagnostic => {
            let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            if(diagnostic.file){
                let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
                alld.push({
                    line: line+1,
                    column: character,
                    message: message,
                    filename: diagnostic.file.fileName
                });
            }else{
                alld.push({
                    code: diagnostic.code,
                    message: message
                });
            }
        });
        
        if( alld.length==0 && options.compress && emitResult.emittedFiles){
            let surround = options.surround;
            emitResult.emittedFiles.forEach(file => {
                let minifyLib = new MinifyJsCommand(undefined, undefined, file, surround);
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