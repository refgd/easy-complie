import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as extend from 'extend';
import * as mkpath from 'mkpath'

import * as Configuration from "../../Configuration";
import * as StatusBarMessage from "../../StatusBarMessage";
import {StatusBarMessageTypes} from "../../StatusBarMessageTypes";

const minjs = require('uglify-js');
const defaultOpts = {
    "mangle": {
        "properties":{
            "regex": /^_/
        }
    },
    "surround": "",
    "compress": {}
}
export class MinifyJsCommand
{
    public constructor(
        private oriFile: string | undefined,
        private jsDiagnosticCollection: vscode.DiagnosticCollection | undefined,
        private file: string | undefined,
        private surround: string | undefined
    ){
    }

    public execute()
    {
        StatusBarMessage.hideError();

        let filename;
        if(this.file) filename = this.file;
        else filename = this.oriFile;

        let opts = Configuration.getGlobalOptions(filename, 'js', defaultOpts);
        let compilingMessage = StatusBarMessage.show("$(zap) Minifing js", StatusBarMessageTypes.INDEFINITE);
        let startTime: number = Date.now();

        if(this.surround){
            opts.surround = this.surround;
        }
        
        readFilePromise(filename).then(buffer =>
            {
                let content: string = buffer.toString();
                if(typeof opts.surround == "string" && opts.surround != ''){
                    content = opts.surround.replace(/\$\{code\}/g, content.replace(/\$/g, '$$$$'));
                }
                let uglifyOptions = {
                    "mangle": opts.mangle,
                    "compress": opts.compress,
                };
                if(opts.hasOwnProperty('uglifyOptions')){
                    uglifyOptions = Object.assign({}, uglifyOptions, opts['uglifyOptions']);
                }
                let results = minjs.minify(content, uglifyOptions);
                if(results.error) throw new Error(results.error);

                let outFile = filename;
                if(!this.file){
                    const filePath: string = path.dirname(filename);
                    const outExt = opts.outExt?opts.outExt:'.js';
                    const baseFilename: string = path.parse(filename).name;

                    let outDir = filePath;
                    if(opts.outDir){
                        outDir = Configuration.resolveFilePath(opts.outDir, filePath, filename);
                    }
                    outFile = path.resolve(outDir, baseFilename+outExt);
                }
                return writeFileContents(outFile, results.code);
            }).then(() =>
            {
                let elapsedTime: number = (Date.now() - startTime);
                compilingMessage.dispose();
                if(this.jsDiagnosticCollection)
                    this.jsDiagnosticCollection.set(vscode.Uri.parse(filename), []);

                StatusBarMessage.show(`$(check) Js minified in ${elapsedTime}ms`, StatusBarMessageTypes.SUCCESS);
            }).catch((error: any) =>
            {
                if(this.jsDiagnosticCollection){
                    let uri:vscode.Uri;
                    if(error.filename && filename != error.filename){
                        uri = vscode.Uri.parse(error.filename);
                    }else{
                        uri = vscode.Uri.parse(filename);
                    }

                    this.jsDiagnosticCollection.set(uri, [StatusBarMessage.getDiagnostic(error)]);
                }else{
                    vscode.window.showErrorMessage(error.message);
                }

                compilingMessage.dispose();
                StatusBarMessage.show("$(alert) Error minify js (more detail in Errors and Warnings)", StatusBarMessageTypes.ERROR);
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