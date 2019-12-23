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
        private filePath: string,
        private sassDiagnosticCollection: vscode.DiagnosticCollection)
    {
    }

    public execute()
    {
        StatusBarMessage.hideError();
        let globalOptions = Configuration.getGlobalOptions(this.filePath, 'sass');
        let compilingMessage = StatusBarMessage.show("$(zap) Compiling sass --> css", StatusBarMessageTypes.INDEFINITE);
        let startTime: number = Date.now();
        let renderPromise = SassCompiler.compile(this.filePath, globalOptions)
            .then((sass: any) =>
            {
                compilingMessage.dispose();
                if(sass) sass.clearFiles();
                let elapsedTime: number = (Date.now() - startTime);
                this.sassDiagnosticCollection.set(vscode.Uri.parse(this.filePath), []);

                StatusBarMessage.show(`$(check) Sass compiled in ${elapsedTime}ms`, StatusBarMessageTypes.SUCCESS);
            })
            .catch((error: any) =>
            {
                compilingMessage.dispose();
                if(error.sass) error.sass.clearFiles();

                let uri:vscode.Uri;
                if(error.filename && this.filePath != error.filename){
                    uri = vscode.Uri.parse(error.filename);
                }else{
                    uri = vscode.Uri.parse(this.filePath);
                }

                this.sassDiagnosticCollection.set(uri, [StatusBarMessage.getDiagnostic(error)]);

                StatusBarMessage.show("$(alert) Error compiling sass (more detail in Errors and Warnings)", StatusBarMessageTypes.ERROR);
            });
    }
}