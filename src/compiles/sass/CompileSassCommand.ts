import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as extend from 'extend';

import Configuration = require("../../Configuration");
import SassCompiler = require("./SassCompiler");
import StatusBarMessage = require("../../StatusBarMessage");
import StatusBarMessageTypes = require("../../StatusBarMessageTypes");

class CompileSassCommand
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
                if(sass) sass.clearFiles();
                let elapsedTime: number = (Date.now() - startTime);
                compilingMessage.dispose();
                this.sassDiagnosticCollection.set(this.document.uri, []);

                StatusBarMessage.show(`$(check) Sass compiled in ${elapsedTime}ms`, StatusBarMessageTypes.SUCCESS);
            })
            .catch((error: any) =>
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
                    // sass errors, try to highlight the affected range
                    let lineIndex: number = error.line - 1;
                    let affectedLine: vscode.TextLine = this.document.lineAt(lineIndex);
                    range = new vscode.Range(lineIndex, error.column, lineIndex, affectedLine.range.end.character);
                }

                compilingMessage.dispose();
                let diagnosis = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
                this.sassDiagnosticCollection.set(this.document.uri, [diagnosis]);

                StatusBarMessage.show("$(alert) Error compiling sass (more detail in Errors and Warnings)", StatusBarMessageTypes.ERROR);
            });
    }
}

export = CompileSassCommand;