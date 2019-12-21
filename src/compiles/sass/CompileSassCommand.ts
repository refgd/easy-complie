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
                compilingMessage.dispose();
                if(error.sass) error.sass.clearFiles();

                let uri:vscode.Uri = this.document.uri;
                if(error.filename && this.document.fileName != error.filename){
                    uri = vscode.Uri.parse(error.filename);
                }

                this.sassDiagnosticCollection.set(uri, [StatusBarMessage.getDiagnostic(error)]);

                StatusBarMessage.show("$(alert) Error compiling sass (more detail in Errors and Warnings)", StatusBarMessageTypes.ERROR);
            });
    }
}