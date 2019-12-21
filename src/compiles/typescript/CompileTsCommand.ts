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
                    if(allDiagnostics.length>0){
                        let alld: Array<vscode.Diagnostic> = [];
                        allDiagnostics.forEach(diagnostic => {
                            alld.push(StatusBarMessage.getDiagnostic(diagnostic));
                        });
                        this.tsDiagnosticCollection.set(this.document.uri, alld);

                        StatusBarMessage.show("$(alert) Error compiling typescript (more detail in Errors and Warnings)", StatusBarMessageTypes.ERROR);
                    }else{
                        let elapsedTime: number = (Date.now() - startTime);
    
                        StatusBarMessage.show(`$(check) Typescript compiled in ${elapsedTime}ms`, StatusBarMessageTypes.SUCCESS);
                    }
                }
                else {
                  StatusBarMessage.show(`$(check) Typescript compiling disabled`, StatusBarMessageTypes.SUCCESS);
                }
            })
            .catch((error: any) =>
            {
                compilingMessage.dispose();

                let uri:vscode.Uri = this.document.uri;
                if(error.filename && this.document.fileName != error.filename){
                    uri = vscode.Uri.parse(error.filename);
                }

                this.tsDiagnosticCollection.set(uri, [StatusBarMessage.getDiagnostic(error)]);

                StatusBarMessage.show("$(alert) Error compiling typescript (more detail in Errors and Warnings)", StatusBarMessageTypes.ERROR);
            });
    }
}
