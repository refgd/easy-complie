'use strict';
import * as vscode from 'vscode';
import * as Configuration from "./Configuration";
import ignore from 'ignore';

const impor = require('impor')(__dirname);
// const LessCompiler = impor("./compiles/less/CompileLessCommand") as typeof import('./compiles/less/CompileLessCommand');
// const SassCompiler = impor("./compiles/sass/CompileSassCommand") as typeof import('./compiles/sass/CompileSassCommand');
// const TsCompiler = impor("./compiles/typescript/CompileTsCommand") as typeof import('./compiles/typescript/CompileTsCommand');
// const JsCompiler = impor("./minify/js/MinifyJsCommand") as typeof import('./minify/js/MinifyJsCommand');
// const CssCompiler = impor("./minify/css/MinifyCssCommand") as typeof import("./minify/css/MinifyCssCommand");

// const CompileLessCommand = require("./compiles/less/CompileLessCommand");
// const CompileSassCommand = require("./compiles/sass/CompileSassCommand");
// const CompileTsCommand = require("./compiles/typescript/CompileTsCommand");
// const MinifyJsCommand = require("./minify/js/MinifyJsCommand");
// const MinifyCssCommand = require("./minify/css/MinifyCssCommand");

const LESS_EXT = ".less";
const SASS_EXT = ".sass";
const SCSS_EXT = ".scss";
const TS_EXT = ".ts";
const CSS_EXT = ".css";
const JS_EXT = ".js";
const COMPILE_COMMAND = "easyCompile.compile";
const MINIFY_COMMAND = "easyCompile.minify";
const MINIFYDIR_COMMAND = "easyCompile.minifydir";

let DiagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: vscode.ExtensionContext) {

    DiagnosticCollection = vscode.languages.createDiagnosticCollection();
    let runCommand = function (type: string, document: vscode.TextDocument){
        let organise;
        if(type == LESS_EXT){
            const LessCompiler = impor("./compiles/less/CompileLessCommand") as typeof import('./compiles/less/CompileLessCommand');
            organise = new LessCompiler.CompileLessCommand(document, DiagnosticCollection);
        }else if(type == SASS_EXT){
            const SassCompiler = impor("./compiles/sass/CompileSassCommand") as typeof import('./compiles/sass/CompileSassCommand');
            organise = new SassCompiler.CompileSassCommand(document, DiagnosticCollection);
        }else if(type == TS_EXT){
            const TsCompiler = impor("./compiles/typescript/CompileTsCommand") as typeof import('./compiles/typescript/CompileTsCommand');
            organise = new TsCompiler.CompileTsCommand(document, DiagnosticCollection);
        }else if(type == CSS_EXT){
            const CssCompiler = impor("./minify/css/MinifyCssCommand") as typeof import("./minify/css/MinifyCssCommand");
            organise = new CssCompiler.MinifyCssCommand(document, DiagnosticCollection);
        }else if(type == JS_EXT){
            const JsCompiler = impor("./minify/js/MinifyJsCommand") as typeof import('./minify/js/MinifyJsCommand');
            organise = new JsCompiler.MinifyJsCommand(document, DiagnosticCollection);
        }
        organise.execute();
    }
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
                if(document.fileName.endsWith(LESS_EXT)){
                    if(typeof compileOptions.less === "undefined" || compileOptions.less === true){
                        runCommand(LESS_EXT, document);
                    }
                }
                else if(document.fileName.endsWith(TS_EXT)){
                    if(typeof compileOptions.typescript === "undefined" || compileOptions.typescript === true){
                        runCommand(TS_EXT, document);
                    }
                }
                else if(document.fileName.endsWith(SASS_EXT) || document.fileName.endsWith(SCSS_EXT)){
                    if(typeof compileOptions.sass === "undefined" || compileOptions.sass === true){
                        runCommand(SASS_EXT, document);
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
    
    // automatically compile/minfy on save
    let didSaveEvent = vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) =>
    {
        let compileOptions = Configuration.getGlobalOptions(document.fileName);
        if(compileOptions.ignore){
            const ig = ignore().add(compileOptions.ignore);
            if(ig.ignores(document.fileName)) return;
        }
        if (document.fileName.endsWith(LESS_EXT) || document.fileName.endsWith(TS_EXT) || document.fileName.endsWith(SASS_EXT) || document.fileName.endsWith(SCSS_EXT))
        {
            vscode.commands.executeCommand(COMPILE_COMMAND);
        }else if (document.fileName.endsWith(JS_EXT) && compileOptions.minifyJsOnSave)
        {
            runCommand(JS_EXT, document);
        }else if (document.fileName.endsWith(CSS_EXT) && compileOptions.minifyCssOnSave)
        {
            runCommand(CSS_EXT, document);
        }
    });
    
    // dismiss less/sass/scss errors on file close
    let didCloseEvent = vscode.workspace.onDidCloseTextDocument((document: vscode.TextDocument) =>
    {
        if (document.fileName.endsWith(LESS_EXT) || document.fileName.endsWith(SASS_EXT) || document.fileName.endsWith(SCSS_EXT))
        {
            DiagnosticCollection.delete(document.uri);
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
                    runCommand(JS_EXT, document);
                }
                else if(document.fileName.endsWith(CSS_EXT)){
                    runCommand(CSS_EXT, document);
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
