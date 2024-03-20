import * as ts from "typescript"
import * as path from 'path'
import * as fs from 'fs'
import * as swc from '@swc/core';
import * as mkpath from 'mkpath'

import * as Configuration from "../../Configuration";
import * as FileOptionsParser from "../../FileOptionsParser";
import { MinifyJsCommand } from "../../minify/js/MinifyJsCommand";

const DEFAULT_EXT = ".js";

const defaultMinifyOpts = {
    "mangle": {
        "properties":{
            "regex": /^_/
        }
    },
    "compress": {}
}

// compile the given ts file
export function compile(tsFile: string, defaults): Promise<any> {
    return readFilePromise(tsFile).then(buffer => {
        const content: string = buffer.toString();
        const options = FileOptionsParser.parse(content, defaults);
        const tsPath: string = path.dirname(tsFile);

        // main is set: compile the referenced file instead
        if (options.main) {
            const mainFilePaths: string[] = Configuration.resolveMainFilePaths(options.main, tsPath, tsFile);
            if (!options.exclude) options.exclude = [];
            if (options.excludes) options.exclude = Object.assign([], options.exclude, options.excludes);
            const excludePaths: string[] = Configuration.resolveMainFilePaths(options.exclude, tsPath, tsFile);
            let lastPromise: Promise<any> | null = null;
            if (mainFilePaths && mainFilePaths.length > 0) {
                for (const filePath of mainFilePaths) {
                    if (filePath.indexOf('*') > -1) {
                        const paths = filePath.split('*');
                        const subfiles = getSubFiles(paths[0], paths[1], excludePaths);
                        for (const fileP of subfiles) {
                            lastPromise = compilenext(fileP, defaults, lastPromise);
                        }
                    } else {
                        lastPromise = compilenext(filePath, defaults, lastPromise);
                    }
                }
                return lastPromise;
            }
        }

        // out
        if (typeof options.outfile !== "string"
            && typeof options.outdir !== "string") {
            // is null or false: do not compile
            return null;
        }

        const outfile: string | undefined = options.outfile;
        const outdir: string | undefined = options.outdir;

        const baseFilename: string = path.parse(tsFile).name;
        const pathToTypes = path.resolve(Configuration.intepolatePath('${workspaceRoot}/node_modules/@types'));
        let tsOptions: any = {
            noEmitOnError: true, noImplicitAny: false, sourceMap: false,
            allowJs: true, removeComments: true, listEmittedFiles: true,
            target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.AMD,
            typeRoots: [pathToTypes]
        }
        tsOptions = Object.assign({}, tsOptions, options);
        if (typeof outfile === "string") {
            tsOptions = Object.assign({}, tsOptions, { outFile: Configuration.resolveFilePath(outfile, tsPath, tsFile) });
        }
        else if (typeof outdir === "string") {
            tsOptions = Object.assign({}, tsOptions, { outDir: Configuration.resolveFilePath(outdir, tsPath, tsFile) });
        }

        if (Array.isArray(tsOptions.lib)) {
            tsOptions.lib.forEach((o, i, a) => o.indexOf('.d.') > -1 ? null : a[i] = "lib." + o + ".d.ts");
        }

        const alld: Array<object> = [];
        if(options.useSWC){

            const regex = /^[\s]*\/\/.*?<amd-module.*?name="(.*)"/gm;

            let matches;
            let moduleId;

            while ((matches = regex.exec(content)) !== null) {
                moduleId = matches[1];
            }

            const swcOptions:swc.Options = {
                "jsc": {
                    "parser": {
                        "syntax": "typescript",
                        "tsx": false,
                        "dynamicImport": false,
                        "decorators": false
                    },
                    "transform": {
                        "legacyDecorator": true,
                        "decoratorMetadata": true
                    },
                    "target": 'es2017',
                    "loose": false,
                    "externalHelpers": false,
                    "keepClassNames": false,
                    "preserveAllComments": true
                }
            };

            if(!moduleId){
                swcOptions.module = {
                    "type": 'commonjs',
                    "strict": false,
                    "strictMode": false,
                    "noInterop": false,
                    "lazy": false
                }
            }else{
                swcOptions.module = {
                    "type": 'amd',
                    "moduleId": moduleId,
                    "strict": false,
                    "strictMode": false,
                    "noInterop": false,
                    "lazy": false
                }
            }

            return swc.bundle({
                entry: {
                    web: tsFile,
                },
                output: {
                    path: "",
                    name: "",
                },
                module: {},
                options: swcOptions,
            }).then(result => {
                if(swcOptions.module?.type == 'amd'){
                    return swc.transform(result.web.code, swcOptions)
                }
                return result.web;
            }).then(result => {
                if( alld.length==0 && options.compress){
                    if(typeof options.surround == "string" && options.surround != ''){
                        result.code = options.surround.replace(/\$\{code\}/g, result.code.replace(/\$/g, '$$$$'));
                    }
                    
                    return swc.minify(result.code, {
                        "compress": true,
                        "mangle": true
                    });
                }
                return result;
            }).then(result => {
                return writeFileContents(tsOptions.outFile, result.code);
            }).then(() => {
                return alld;
            }).catch((error: Error) => {
                alld.push({
                    code: error.name,
                    message: error.message
                });
                return alld;
            });
        }
        
        let program = ts.createProgram([tsFile], tsOptions);
        let emitResult = program.emit();

        let allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

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
            return new Promise((resolve, reject) =>
            {
                if(emitResult.emittedFiles && emitResult.emittedFiles.length>0){
                    let surround = options.surround;
                    let total = emitResult.emittedFiles.length;
                    let done = function(){
                        if(--total==0){
                            resolve(alld);
                        }
                    }
                    emitResult.emittedFiles.forEach(file => {
                        let minifyLib = new MinifyJsCommand(undefined, undefined, file, surround);
                        minifyLib.execute(function (){
                            done();
                        });
                    });
                }else{
                    resolve(alld);
                }
            });
        }

        return returnPromise(alld);
    });
}

function returnPromise(obj: any): Promise<any> {
    return new Promise((resolve, reject) => {
        resolve(obj);
    });
}

function readFilePromise(this: void, filename: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, (err: any, buffer: Buffer) => {
            if (err) {
                reject(err)
            }
            else {
                resolve(buffer);
            }
        });
    });
}

function getSubFiles(parent, file, excludePaths) {
    let dirList = fs.readdirSync(parent);
    let paths: string[] = [];
    if (dirList) {
        dirList.forEach(function (item) {
            let p = path.join(parent, item);
            if (excludePaths.indexOf(p) < 0) {
                p = path.join(p, file);
                if (fs.existsSync(p)) {
                    paths.push(p);
                }
            }
        });
    }
    return paths;
}

function promiseChainer(lastPromise: Promise<void>, nextPromise: Promise<void>): Promise<any> {
    lastPromise.then(() => nextPromise);
    return nextPromise;
}

function compilenext(filePath, defaults, lastPromise): Promise<any> {
    const mainPath: path.ParsedPath = path.parse(filePath);
    const mainRootFileInfo = Configuration.getRootFileInfo(mainPath);
    const mainDefaults = Object.assign({}, defaults, { rootFileInfo: mainRootFileInfo });
    const compilePromise = compile(filePath, mainDefaults);
    if (lastPromise) {
        lastPromise = promiseChainer(lastPromise, compilePromise);
    }
    else {
        lastPromise = compilePromise;
    }
    return lastPromise;
}

function writeFileContents(this: void, filepath: string, content: any): Promise<any> {
    return new Promise((resolve, reject) => {
        mkpath(path.dirname(filepath), err => {
            if (err) {
                return reject(err);
            }

            fs.writeFile(filepath, content, err => err ? reject(err) : resolve(filepath));
        });
    });
}