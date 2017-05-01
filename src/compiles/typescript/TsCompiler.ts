import * as ts from "typescript"
import * as mkpath from 'mkpath'
import * as path from 'path'
import * as extend from 'extend'
import * as fs from 'fs'
import * as vscode from 'vscode';

import Configuration = require("../../Configuration");
import FileOptionsParser = require("../../FileOptionsParser");

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
            let lastPromise: Promise<any> | null = null;
            let promiseChainer = (lastPromise: Promise<any>, nextPromise: Promise<any>) => lastPromise.then(() => nextPromise);
            if (mainFilePaths && mainFilePaths.length > 0)
            {
                for (const filePath of mainFilePaths)
                {
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

        let tsOptions = {
            noEmitOnError: true, noImplicitAny: false, sourceMap: false,
            allowJs: true, removeComments: true,
            target: ts.ScriptTarget.ES5, module: ts.ModuleKind.AMD
        }
        if (typeof outfile === "string") 
        {
            tsOptions = extend({}, tsOptions, {outFile: resolveFilePath(outfile, tsPath, tsFile)});
        }
        else if (typeof outdir === "string") 
        {
            tsOptions = extend({}, tsOptions, {outDir: resolveFilePath(outdir, tsPath, tsFile)});
        }
        let program = ts.createProgram([tsFile], tsOptions);
        let emitResult = program.emit();

        let allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);
        let alld: Array<object> = [];

        // allDiagnostics.forEach(diagnostic => {
        //     let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
        //     let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        //     alld.push({
        //         lineIndex: line,
        //         column: character,
        //         message: message
        //     });
        // });

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
    if(vscode.workspace.rootPath)
        return (<string>path).replace(/\$\{workspaceRoot\}/g, vscode.workspace.rootPath);
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