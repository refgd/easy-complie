'use strict';
import * as vscode from 'vscode';
import ignore from 'ignore';
import CompileLessCommand = require("./compiles/less/CompileLessCommand");
import CompileSassCommand = require("./compiles/sass/CompileSassCommand");
import CompileTsCommand = require("./compiles/typescript/CompileTsCommand");
import MinifyJsCommand = require("./minify/js/MinifyJsCommand");
import MinifyCssCommand = require("./minify/css/MinifyCssCommand");
import Configuration = require("./Configuration");

const LESS_EXT = ".less";
const SASS_EXT = ".sass";
const SCSS_EXT = ".scss";
const TS_EXT = ".ts";
const CSS_EXT = ".css";
const JS_EXT = ".js";
const COMPILE_COMMAND = "easyCompile.compile";
const MINIFY_COMMAND = "easyCompile.minify";
const MINIFYDIR_COMMAND = "easyCompile.minifydir";

let DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {

    DiagnosticCollection = vscode.languages.createDiagnosticCollection();

    // compile command
    let compileCommand = vscode.commands.registerCommand(COMPILE_COMMAND, () =>
    {
        let activeEditor = vscode.window.activeTextEditor;
        if (activeEditor)
        {
            let document: vscode.TextDocument = activeEditor.document;
            if (document)
            {
                let compileOptions = Configuration.getGlobalOptions(document.fileName);
                let organise;
                if(document.fileName.endsWith(LESS_EXT)){
                    if(typeof compileOptions.less === "undefined" || compileOptions.less === true){
                        organise = new CompileLessCommand(document, DiagnosticCollection);
                        organise.execute();
                    }
                }
                else if(document.fileName.endsWith(TS_EXT)){
                    if(typeof compileOptions.typescript === "undefined" || compileOptions.typescript === true){
                        organise = new CompileTsCommand(document, DiagnosticCollection);
                        organise.execute();
                    }
                }
                else if(document.fileName.endsWith(SASS_EXT) || document.fileName.endsWith(SCSS_EXT)){
                    if(typeof compileOptions.sass === "undefined" || compileOptions.sass === true){
                        organise = new CompileSassCommand(document, DiagnosticCollection);
                        organise.execute();
                    }
                }
                else
                {
                    vscode.window.showWarningMessage("This command not work for this file.");
                }
            }
        }
        else
        {
            vscode.window.showInformationMessage("This command available for this file.");
        }
    });
    
    // automatically compile on save
    let didSaveEvent = vscode.workspace.onDidSaveTextDocument((doc: vscode.TextDocument) =>
    {
        let compileOptions = Configuration.getGlobalOptions(doc.fileName);
        let ig = ignore().add(compileOptions.ignore);
        if (doc.fileName.endsWith(LESS_EXT) || doc.fileName.endsWith(TS_EXT) || doc.fileName.endsWith(SASS_EXT) || doc.fileName.endsWith(SCSS_EXT))
        {
            if(!ig.ignores(doc.fileName)) vscode.commands.executeCommand(COMPILE_COMMAND);
        }
    });
    
    // dismiss less/sass/scss errors on file close
    let didCloseEvent = vscode.workspace.onDidCloseTextDocument((doc: vscode.TextDocument) =>
    {
        if (doc.fileName.endsWith(LESS_EXT) || doc.fileName.endsWith(SASS_EXT) || doc.fileName.endsWith(SCSS_EXT))
        {
            DiagnosticCollection.delete(doc.uri);
        }
    })

    // minify command
    let minifyCommand = vscode.commands.registerCommand(MINIFY_COMMAND, () =>
    {
        let activeEditor = vscode.window.activeTextEditor;
        if (activeEditor)
        {
            let document: vscode.TextDocument = activeEditor.document;
            if (document)
            {
                let minifyLib;
                if(document.fileName.endsWith(JS_EXT)){
                    minifyLib = new MinifyJsCommand(document, DiagnosticCollection);
                    minifyLib.execute();
                }
                else if(document.fileName.endsWith(CSS_EXT)){
                    minifyLib = new MinifyCssCommand(document, DiagnosticCollection);
                    minifyLib.execute();
                }
                else
                {
                    vscode.window.showWarningMessage("This command not work for this file.");
                }
            }
        }
        else
        {
            vscode.window.showInformationMessage("This command only available after file opened.");
        }
    });

    let minifydirCommand = vscode.commands.registerCommand(MINIFYDIR_COMMAND, () =>
    {
        vscode.window.showInformationMessage("Not implement.");
    });

    context.subscriptions.push(compileCommand);
    context.subscriptions.push(minifyCommand);
    context.subscriptions.push(minifydirCommand);
    context.subscriptions.push(didSaveEvent);
    context.subscriptions.push(didCloseEvent);
}

// this method is called when your extension is deactivated
export function deactivate()
{
    if (DiagnosticCollection)
    {
        DiagnosticCollection.dispose();
    }
}
