import {StatusBarMessageTypes} from "./StatusBarMessageTypes";
import * as vscode from 'vscode';

const ERROR_COLOR_CSS = "rgba(255,125,0,1)";
const ERROR_DURATION_MS = 10000;
const SUCCESS_DURATION_MS = 1500;

const channel:vscode.OutputChannel = vscode.window.createOutputChannel("Easy Compile");
// channel.show();

let errorMessage: vscode.StatusBarItem | null;

export function hideError()
{
    if (errorMessage)
    {
        errorMessage.hide();
        errorMessage = null;
    }
}

export function show(message: string, type: StatusBarMessageTypes)
{
    this.hideError();

    channel.appendLine(message);

    switch (type)
    {
        case StatusBarMessageTypes.SUCCESS:
            return vscode.window.setStatusBarMessage(message, SUCCESS_DURATION_MS);

        case StatusBarMessageTypes.INDEFINITE:
            return vscode.window.setStatusBarMessage(message);

        case StatusBarMessageTypes.ERROR:
            errorMessage = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
            errorMessage.text = message;
            errorMessage.command = "workbench.action.showErrorsWarnings";
            errorMessage.color = ERROR_COLOR_CSS;
            errorMessage.show();
            setTimeout(hideError, ERROR_DURATION_MS);

            return errorMessage;
    }
}

export function output(message: string)
{
    channel.appendLine(message);
}

export function getDiagnostic(error):vscode.Diagnostic
{
    let message: string = 'Unknow error';
    let range: vscode.Range = new vscode.Range(0, 0, 0, 0);

    if (error.code)
    {
        switch (error.code)
        {
            case 'EACCES':
            case 'ENOENT':
                message = `Cannot open file '${error.path}'`;
                break;
            default:
                if(error.message) message = error.message;
        }
        
        channel.appendLine(message);
    }
    else if (error.line !== undefined && error.column !== undefined)
    {
        // typescript errors, try to highlight the affected range
        let lineIndex: number = error.line - 1;
        range = new vscode.Range(lineIndex, error.column, lineIndex, 0);
        message = error.message;
    }

    let diagnosis = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);

    return diagnosis;
}