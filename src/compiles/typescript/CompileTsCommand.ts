import * as vscode from 'vscode';

import * as Configuration from "../../Configuration";
import * as StatusBarMessage from "../../StatusBarMessage";
import {StatusBarMessageTypes} from "../../StatusBarMessageTypes";
import * as TsCompiler from "./TsCompiler";

export class CompileTsCommand
{
    public constructor(
        private filePath: string,
        private tsDiagnosticCollection: vscode.DiagnosticCollection)
    {
    }

    public execute()
    {
        StatusBarMessage.hideError();
        
        let globalOptions = Configuration.getGlobalOptions(this.filePath, 'typescript');
        let compilingMessage = StatusBarMessage.show("$(zap) Compiling ts --> js", StatusBarMessageTypes.INDEFINITE);
        let startTime: number = Date.now();
        let renderPromise = TsCompiler.compile(this.filePath, globalOptions)
            .then((allDiagnostics) =>
            {
                compilingMessage.dispose();
                if(allDiagnostics !== null){
                    if(allDiagnostics.length>0){
                        let alld: Array<vscode.Diagnostic> = [];
                        allDiagnostics.forEach(diagnostic => {
                            alld.push(StatusBarMessage.getDiagnostic(diagnostic));
                        });
                        this.tsDiagnosticCollection.set(vscode.Uri.parse(this.filePath), alld);

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

                let uri:vscode.Uri;
                if(error.filename && this.filePath != error.filename){
                    uri = vscode.Uri.parse(error.filename);
                }else{
                    uri = vscode.Uri.parse(this.filePath);
                }

                this.tsDiagnosticCollection.set(uri, [StatusBarMessage.getDiagnostic(error)]);

                StatusBarMessage.show("$(alert) Error compiling typescript (more detail in Errors and Warnings)", StatusBarMessageTypes.ERROR);
            });
    }
}
