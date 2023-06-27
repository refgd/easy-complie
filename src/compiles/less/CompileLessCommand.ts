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
        private filePath: string,
        private lessDiagnosticCollection: vscode.DiagnosticCollection)
    {
    }

    public execute(callback = () => {})
    {
        StatusBarMessage.hideError();

        let globalOptions = Configuration.getGlobalOptions(this.filePath, 'less');
        let compilingMessage = StatusBarMessage.show("$(zap) Compiling less --> css", StatusBarMessageTypes.INDEFINITE);
        let startTime: number = Date.now();
        let renderPromise = LessCompiler.compile(this.filePath, globalOptions)
            .then(() =>
            {
                compilingMessage.dispose();
                let elapsedTime: number = (Date.now() - startTime);
                this.lessDiagnosticCollection.set(vscode.Uri.parse(this.filePath), []);

                StatusBarMessage.show(`$(check) Less compiled in ${elapsedTime}ms`, StatusBarMessageTypes.SUCCESS);
                callback();
            })
            .catch((error: any) =>
            {
                compilingMessage.dispose();

                let file:string;
                if(error.filename && this.filePath != error.filename){
                    file = error.filename;
                }else{
                    file = this.filePath;
                }

                StatusBarMessage.formatDiagnostic(this.lessDiagnosticCollection, file, [StatusBarMessage.getDiagnostic(error)]);

                StatusBarMessage.show("$(alert) Error compiling less (more detail in Errors and Warnings)", StatusBarMessageTypes.ERROR);
                callback();
            });
    }
}