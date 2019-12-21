import * as vscode from 'vscode';

import * as Configuration from "../../Configuration";
import * as StatusBarMessage from "../../StatusBarMessage";
import {StatusBarMessageTypes} from "../../StatusBarMessageTypes";

import * as SassCompiler from "./SassCompiler";
// const impor = require('impor')(__dirname);
// const SassCompiler = impor("./SassCompiler") as typeof import('./SassCompiler');

export class CompileSassCommand
{
    public constructor(
        private document: vscode.TextDocument,
        private sassDiagnosticCollection: vscode.DiagnosticCollection)
    {
    }

    public execute()
    {
        StatusBarMessage.hideError();
        let globalOptions = Configuration.getGlobalOptions(this.document.fileName, 'sass');
        let compilingMessage = StatusBarMessage.show("$(zap) Compiling sass --> css", StatusBarMessageTypes.INDEFINITE);
        let startTime: number = Date.now();
        let renderPromise = SassCompiler.compile(this.document.fileName, globalOptions)
            .then((sass: any) =>
            {
                compilingMessage.dispose();
                if(sass) sass.clearFiles();
                let elapsedTime: number = (Date.now() - startTime);
                this.sassDiagnosticCollection.set(this.document.uri, []);

                StatusBarMessage.show(`$(check) Sass compiled in ${elapsedTime}ms`, StatusBarMessageTypes.SUCCESS);
            })
            .catch((error: any) =>
            {
                let uri:vscode.Uri = this.document.uri;
                if(error.filename && this.document.fileName != error.filename){
                    uri = vscode.Uri.parse(error.filename);
                }

                compilingMessage.dispose();
                if(error.sass) error.sass.clearFiles();
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
                    }
                }
                else if (error.line !== undefined && error.column !== undefined)
                {
                    // sass errors, try to highlight the affected range
                    let lineIndex: number = error.line - 1;
                    range = new vscode.Range(lineIndex, error.column, lineIndex, 0);
                }

                let diagnosis = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
                this.sassDiagnosticCollection.set(uri, [diagnosis]);

                StatusBarMessage.show("$(alert) Error compiling sass (more detail in Errors and Warnings)", StatusBarMessageTypes.ERROR);
            });
    }
}