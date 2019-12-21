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