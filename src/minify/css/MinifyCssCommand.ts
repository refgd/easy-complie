import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as extend from 'extend';
import * as mkpath from 'mkpath';

import * as Configuration from "../../Configuration";
import * as StatusBarMessage from "../../StatusBarMessage";
import {StatusBarMessageTypes} from "../../StatusBarMessageTypes";

const CleanCSS = require("clean-css");

export class MinifyCssCommand
{
    public constructor(
        private document: vscode.TextDocument,
        private cssDiagnosticCollection: vscode.DiagnosticCollection)
    {
    }

    public execute()
    {
        StatusBarMessage.hideError();
        let opts:any = {
            processImport: false,
            rebase: false,
            advanced: true,
            groupmedia: false,
            sourceMap: false,
            sourceMapFileInline: false
        }
        const cssFile = this.document.fileName;
        const cssPath: string = path.dirname(cssFile);

        let globalOptions = Configuration.getGlobalOptions(this.document.fileName, 'css');
        let compilingMessage = StatusBarMessage.show("$(zap) Minifing css", StatusBarMessageTypes.INDEFINITE);
        let startTime: number = Date.now();
        opts = extend({}, opts, globalOptions);

        readFilePromise(this.document.fileName).then(buffer =>
            {
                const outExt = opts.outExt?opts.outExt:'.css';
                const baseFilename: string = path.parse(cssFile).name;

                let outDir = cssPath;
                if(opts.outDir){
                    outDir = resolveFilePath(opts.outDir, cssPath, cssFile);
                }
                const outFile = path.resolve(outDir, baseFilename+outExt);

                let content: string = buffer.toString();
                if(opts.groupmedia){
                    let grouper = require('group-css-media-queries');
                    content = grouper(content);
                }
                let output = new CleanCSS(opts).minify(content);
                let css = output.styles;

                let sourceMapFile: string | undefined, sourceMap;
                let replaceList:any = {
                    "$stdin": path.relative(outDir, cssFile)
                };
                if (opts.sourceMap && output.sourceMap)
                {
                    if(!opts.sourceMapFileInline){
                        sourceMapFile = outFile + '.map';
                    }

                    sourceMap = JSON.parse(output.sourceMap);
                    let x;
                    for(x in sourceMap.sources){
                        let path = sourceMap.sources[x];
                        if(replaceList[path]) sourceMap.sources[x] = replaceList[path];
                    }

                    if(sourceMapFile){
                        const mapFileUrl: string = path.basename(sourceMapFile);
                        css += "\n"+'/*# sourceMappingURL='+mapFileUrl+' */';
                    }else{
                        css += "\n"+'/*# sourceMappingURL=data:application/json;charset=utf-8;base64,'+Buffer.from(JSON.stringify(sourceMap)).toString("base64")+'  */';
                    }
                }

                return writeFileContents(outFile, css).then(() =>
                {
                    if (sourceMapFile && sourceMap)
                    {
                        return writeFileContents(sourceMapFile, JSON.stringify(sourceMap));
                    }
                });
            }).then(() =>
            {
                compilingMessage.dispose();
                let elapsedTime: number = (Date.now() - startTime);
                this.cssDiagnosticCollection.set(this.document.uri, []);

                StatusBarMessage.show(`$(check) Css minified in ${elapsedTime}ms`, StatusBarMessageTypes.SUCCESS);
            }).catch((error: any) =>
            {
                compilingMessage.dispose();

                let uri:vscode.Uri = this.document.uri;
                if(error.filename && this.document.fileName != error.filename){
                    uri = vscode.Uri.parse(error.filename);
                }

                this.cssDiagnosticCollection.set(uri, [StatusBarMessage.getDiagnostic(error)]);

                StatusBarMessage.show("$(alert) Error minify css (more detail in Errors and Warnings)", StatusBarMessageTypes.ERROR);
            });
    }
}


function writeFileContents(this: void, filepath: string, content: any): Promise<any>
{
    return new Promise((resolve, reject) =>
    {
        mkpath(path.dirname(filepath), err =>
        {
            if (err)
            {
                return reject(err);
            }

            fs.writeFile(filepath, content, err => err ? reject(err) : resolve());
        });
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