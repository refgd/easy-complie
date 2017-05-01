import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as extend from 'extend';
import * as mkpath from 'mkpath'

import minjs = require('uglify-js');
import Configuration = require("../../Configuration");
import StatusBarMessage = require("../../StatusBarMessage");
import StatusBarMessageTypes = require("../../StatusBarMessageTypes");

class MinifyJsCommand
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
            "mangleProperties": {
                regex: /^_/
            },
            "fromString": true,
            "surround": "(function (define){ ${code} })(define)",
            "compress": {
                "sequences": true,
                "properties": true,
                "dead_code": true,
                "drop_debugger": true,
                "unsafe": true,
                "unsafe_comps": true,
                "conditionals": true,
                "comparisons": true,
                "evaluate": true,
                "booleans": true,
                "loops": true,
                "unused": true,
                "hoist_funs": true,
                "keep_fargs": true,
                "keep_fnames": false,
                "hoist_vars": false,
                "if_return": true,
                "join_vars": true,
                "collapse_vars": true,
                "reduce_vars": true,
                "cascade": true,
                "side_effects": true,
                "pure_getters": false,
                "pure_funcs": null,
                "negate_iife": false,
                "drop_console": false,
                "passes": 1,
                "global_defs": {}
            }
        }

        let globalOptions = Configuration.getGlobalOptions(this.document.fileName, 'js');
        let compilingMessage = StatusBarMessage.show("$(zap) Minifing js", StatusBarMessageTypes.INDEFINITE);
        let startTime: number = Date.now();
        opts = extend({}, opts, globalOptions);
        readFilePromise(this.document.fileName).then(buffer =>
            {
                let content: string = buffer.toString();
                if(typeof opts.surround == "string" && opts.surround != ''){
                    content = opts.surround.replace(/\$\{code\}/g, content);
                }
                let results = minjs.minify(content, opts);
                return writeFileContents(this.document.fileName, results.code);
            }).then(() =>
            {
                let elapsedTime: number = (Date.now() - startTime);
                compilingMessage.dispose();
                this.lessDiagnosticCollection.set(this.document.uri, []);

                StatusBarMessage.show(`$(check) Js minified in ${elapsedTime}ms`, StatusBarMessageTypes.SUCCESS);
            }).catch((error: any) =>
            {
                let message: string = error.message;
                let range: vscode.Range = new vscode.Range(0, 0, 0, 0);

                if (error.code)
                {
                    // fs errors
                    let fileSystemError = error;
                    switch (fileSystemError.code)
                    {
                        case 'EACCES':
                        case 'ENOENT':
                            message = `Cannot open file '${fileSystemError.path}'`;
                            let firstLine: vscode.TextLine = this.document.lineAt(0);
                            range = new vscode.Range(0, 0, 0, firstLine.range.end.character);
                    }
                }
                else if (error.line !== undefined && error.column !== undefined)
                {
                    // less errors, try to highlight the affected range
                    let lineIndex: number = error.line - 1;
                    let affectedLine: vscode.TextLine = this.document.lineAt(lineIndex);
                    range = new vscode.Range(lineIndex, error.column, lineIndex, affectedLine.range.end.character);
                }

                compilingMessage.dispose();
                let diagnosis = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
                this.lessDiagnosticCollection.set(this.document.uri, [diagnosis]);

                StatusBarMessage.show("$(alert) Error compiling less (more detail in Errors and Warnings)", StatusBarMessageTypes.ERROR);
            });
    }
}

export = MinifyJsCommand;


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