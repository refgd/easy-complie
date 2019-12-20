import * as vscode from 'vscode';

import * as Configuration from "../../Configuration";
import * as StatusBarMessage from "../../StatusBarMessage";
import {StatusBarMessageTypes} from "../../StatusBarMessageTypes";
import * as TsCompiler from "./TsCompiler";

export class CompileTsCommand
{
    public constructor(
        private document: vscode.TextDocument,
        private tsDiagnosticCollection: vscode.DiagnosticCollection)
    {
    }

    public execute()
    {
        StatusBarMessage.hideError();
        
        let globalOptions = Configuration.getGlobalOptions(this.document.fileName, 'typescript');
        let compilingMessage = StatusBarMessage.show("$(zap) Compiling ts --> js", StatusBarMessageTypes.INDEFINITE);
        let startTime: number = Date.now();
        let renderPromise = TsCompiler.compile(this.document.fileName, globalOptions)
            .then((allDiagnostics) =>
            {
                compilingMessage.dispose();
                if(allDiagnostics !== null){
                    let elapsedTime: number = (Date.now() - startTime);

                    let alld: Array<vscode.Diagnostic> = [];
                    allDiagnostics.forEach(diagnostic => {
                        let affectedLine: vscode.TextLine = this.document.lineAt(diagnostic.lineIndex);
                        let range: vscode.Range = new vscode.Range(0, 0, 0, 0);
                        range = new vscode.Range(diagnostic.lineIndex, diagnostic.column, diagnostic.lineIndex, affectedLine.range.end.character);
                        alld.push(new vscode.Diagnostic(range, diagnostic.message, vscode.DiagnosticSeverity.Error));
                    });
                    this.tsDiagnosticCollection.set(this.document.uri, alld);

                    StatusBarMessage.show(`$(check) Typescript compiled in ${elapsedTime}ms`, StatusBarMessageTypes.SUCCESS);
                }
                else {
                  StatusBarMessage.show(`$(check) Typescript compiling disabled`, StatusBarMessageTypes.SUCCESS);
                }
            })
            .catch((error: any) =>
            {
                compilingMessage.dispose();
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
                    // typescript errors, try to highlight the affected range
                    let lineIndex: number = error.line - 1;
                    let affectedLine: vscode.TextLine = this.document.lineAt(lineIndex);
                    range = new vscode.Range(lineIndex, error.column, lineIndex, affectedLine.range.end.character);
                }

                let diagnosis = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
                this.tsDiagnosticCollection.set(this.document.uri, [diagnosis]);

                StatusBarMessage.show("$(alert) Error compiling typescript (more detail in Errors and Warnings)", StatusBarMessageTypes.ERROR);
            });
    }
}
