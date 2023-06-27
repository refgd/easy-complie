import * as vscode from 'vscode';
import * as path from 'path';

import * as Configuration from "../../Configuration";
import * as StatusBarMessage from "../../StatusBarMessage";
import {StatusBarMessageTypes} from "../../StatusBarMessageTypes";
import * as TsCompiler from "./TsCompiler";

const defaultOpts = {
    'surround': '(function (define){ ${code} })(define)'
};
export class CompileTsCommand
{
    public constructor(
        private filePath: string,
        private tsDiagnosticCollection: vscode.DiagnosticCollection)
    {
    }

    public execute(callback = () => {})
    {
        StatusBarMessage.hideError();
        
        let globalOptions = Configuration.getGlobalOptions(this.filePath, 'typescript', defaultOpts);
        let compilingMessage = StatusBarMessage.show("$(zap) Compiling ts --> js", StatusBarMessageTypes.INDEFINITE);
        let startTime: number = Date.now();
        let renderPromise = TsCompiler.compile(this.filePath, globalOptions)
            .then((allDiagnostics) =>
            {
                compilingMessage.dispose();
                if(allDiagnostics !== null){
                    if(allDiagnostics.length>0){
                        let files = {};
                        allDiagnostics.forEach(diagnostic => {
                            let file = diagnostic.filename?diagnostic.filename:this.filePath;
                            if(!files[file]) files[file] = [];
                            files[file].push(StatusBarMessage.getDiagnostic(diagnostic));
                        });

                        for (const key in files) {
                            const alld = files[key];
                            StatusBarMessage.formatDiagnostic(this.tsDiagnosticCollection, key, alld);
                        }

                        StatusBarMessage.show("$(alert) Error compiling typescript (more detail in Errors and Warnings)", StatusBarMessageTypes.ERROR);
                    }else{
                        let elapsedTime: number = (Date.now() - startTime);
                        this.tsDiagnosticCollection.set(vscode.Uri.parse(this.filePath), []);

                        StatusBarMessage.show(`$(check) Typescript compiled in ${elapsedTime}ms`, StatusBarMessageTypes.SUCCESS);
                    }
                }
                else {
                  StatusBarMessage.show(`$(check) Typescript compiling disabled`, StatusBarMessageTypes.SUCCESS);
                }
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

                StatusBarMessage.formatDiagnostic(this.tsDiagnosticCollection, file, [StatusBarMessage.getDiagnostic(error)]);

                StatusBarMessage.show("$(alert) Error compiling typescript (more detail in Errors and Warnings)", StatusBarMessageTypes.ERROR);
                callback();
            });
    }
}
