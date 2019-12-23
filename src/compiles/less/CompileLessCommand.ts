import * as vscode from 'vscode';

import * as Configuration from "../../Configuration";
import * as StatusBarMessage from "../../StatusBarMessage";
import {StatusBarMessageTypes} from "../../StatusBarMessageTypes";

import * as LessCompiler from "./LessCompiler";
// const impor = require('impor')(__dirname);
// const LessCompiler = impor("./LessCompiler") as typeof import('./LessCompiler');
export class CompileLessCommand
{
    public constructor(
        private document: vscode.TextDocument,
        private lessDiagnosticCollection: vscode.DiagnosticCollection)
    {
    }

    public execute()
    {
        StatusBarMessage.hideError();

        let globalOptions = Configuration.getGlobalOptions(this.document.fileName, 'less');
        let compilingMessage = StatusBarMessage.show("$(zap) Compiling less --> css", StatusBarMessageTypes.INDEFINITE);
        let startTime: number = Date.now();
        let renderPromise = LessCompiler.compile(this.document.fileName, globalOptions)
            .then(() =>
            {
                compilingMessage.dispose();
                let elapsedTime: number = (Date.now() - startTime);
                this.lessDiagnosticCollection.set(this.document.uri, []);

                StatusBarMessage.show(`$(check) Less compiled in ${elapsedTime}ms`, StatusBarMessageTypes.SUCCESS);
            })
            .catch((error: any) =>
            {
                console.log(error);
                compilingMessage.dispose();

                let uri:vscode.Uri = this.document.uri;
                if(error.filename && this.document.fileName != error.filename){
                    uri = vscode.Uri.parse(error.filename);
                }

                this.lessDiagnosticCollection.set(uri, [StatusBarMessage.getDiagnostic(error)]);

                StatusBarMessage.show("$(alert) Error compiling less (more detail in Errors and Warnings)", StatusBarMessageTypes.ERROR);
            });
    }
}