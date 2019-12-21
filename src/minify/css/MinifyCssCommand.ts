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
        private lessDiagnosticCollection: vscode.DiagnosticCollection)
    {
    }

    public execute()
    {
        StatusBarMessage.hideError();
        let opts = {
            processImport: false,
            rebase: false,
            advanced: true,
            groupmedia: false
        }

        let globalOptions = Configuration.getGlobalOptions(this.document.fileName, 'css');
        let compilingMessage = StatusBarMessage.show("$(zap) Minifing css", StatusBarMessageTypes.INDEFINITE);
        let startTime: number = Date.now();
        opts = extend({}, opts, globalOptions);

        readFilePromise(this.document.fileName).then(buffer =>
            {
                let content: string = buffer.toString();
                if(opts.groupmedia){
                    let grouper = require('group-css-media-queries');
                    content = grouper(content);
                }
                let output = new CleanCSS(opts).minify(content);
                return writeFileContents(this.document.fileName, output.styles);
            }).then(() =>
            {
                compilingMessage.dispose();
                let elapsedTime: number = (Date.now() - startTime);
                this.lessDiagnosticCollection.set(this.document.uri, []);

                StatusBarMessage.show(`$(check) Css minified in ${elapsedTime}ms`, StatusBarMessageTypes.SUCCESS);
            }).catch((error: any) =>
            {
                compilingMessage.dispose();
                let message: string = error.message;
                let range: vscode.Range = new vscode.Range(0, 0, 0, 0);

                let uri:vscode.Uri = this.document.uri;
                if(error.filename && this.document.fileName != error.filename){
                    uri = vscode.Uri.parse(error.filename);
                }

                if (error.code)
                {
                    // fs errors
                    let fileSystemError = error;
                    switch (fileSystemError.code)
                    {
                        case 'EACCES':
                        case 'ENOENT':
                            message = `Cannot open file '${fileSystemError.path}'`;
                    }
                }
                else if (error.line !== undefined && error.column !== undefined)
                {
                    // less errors, try to highlight the affected range
                    let lineIndex: number = error.line - 1;
                    range = new vscode.Range(lineIndex, error.column, lineIndex, 0);
                }

                let diagnosis = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
                this.lessDiagnosticCollection.set(uri, [diagnosis]);

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