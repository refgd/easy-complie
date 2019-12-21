import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as extend from 'extend';
import * as mkpath from 'mkpath'

import * as Configuration from "../../Configuration";
import * as StatusBarMessage from "../../StatusBarMessage";
import {StatusBarMessageTypes} from "../../StatusBarMessageTypes";

const minjs = require('uglify-js');

export class MinifyJsCommand
{
    public constructor(
        private document: any,
        private jsDiagnosticCollection: any,
        private file: any = false,
        private surround: any = null)
    {
    }

    public execute()
    {
        StatusBarMessage.hideError();

        let opts = {
            "mangle": {
                "properties":{
                    "regex": /^_/
                }
            },
            "surround": this.surround===null?"(function (define){ ${code} })(define)":this.surround,
            "compress": {}
        };

        let filename;
        if(this.file) filename = this.file;
        else filename = this.document.fileName;

        let globalOptions = Configuration.getGlobalOptions(filename, 'js');
        let compilingMessage = StatusBarMessage.show("$(zap) Minifing js", StatusBarMessageTypes.INDEFINITE);
        let startTime: number = Date.now();
        opts = extend({}, opts, globalOptions);
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
                return writeFileContents(filename, results.code);
            }).then(() =>
            {
                let elapsedTime: number = (Date.now() - startTime);
                compilingMessage.dispose();
                if(!this.file)
                    this.jsDiagnosticCollection.set(this.document.uri, []);

                StatusBarMessage.show(`$(check) Js minified in ${elapsedTime}ms`, StatusBarMessageTypes.SUCCESS);
            }).catch((error: any) =>
            {
                if(!this.file){
                    let uri:vscode.Uri = this.document.uri;
                    if(error.filename && this.document.fileName != error.filename){
                        uri = vscode.Uri.parse(error.filename);
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