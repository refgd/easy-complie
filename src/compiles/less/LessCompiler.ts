import * as less from 'less'
import * as mkpath from 'mkpath'
import * as path from 'path'
import * as extend from 'extend'
import * as fs from 'fs'
import * as vscode from 'vscode';

import Configuration = require("../../Configuration");
import FileOptionsParser = require("../../FileOptionsParser");

const DEFAULT_EXT = ".css";

// compile the given less file
export function compile(lessFile: string, defaults): Promise<void>
{
    return readFilePromise(lessFile).then(buffer =>
    {
        const content: string = buffer.toString();
        const options = FileOptionsParser.parse(content, defaults);
        const lessPath: string = path.dirname(lessFile);

        // main is set: compile the referenced file instead
        if (options.main)
        {
            const mainFilePaths: string[] = resolveMainFilePaths(options.main, lessPath, lessFile);
            if(!options.exclude) options.exclude = [];
            if(options.excludes) options.exclude = extend([], options.exclude, options.excludes);
            const excludePaths: string[] = resolveMainFilePaths(options.exclude, lessPath, lessFile);
            let lastPromise: Promise<void> | null = null;
            if (mainFilePaths && mainFilePaths.length > 0)
            {
                for (const filePath of mainFilePaths)
                {
                    if(filePath.indexOf('*')>-1){
                        const paths = filePath.split('*');
                        const subfiles = getSubFiles(paths[0], paths[1], excludePaths);
                        
                        for (const fileP of subfiles)
                        {
                            lastPromise = compilenext(fileP, defaults, lastPromise);
                        }
                    }else{
                        lastPromise = compilenext(filePath, defaults, lastPromise);
                    }
                }
                return lastPromise;
            }
        }

        // out
        if (options.out === null || options.out === false)
        {
            // is null or false: do not compile
            return null;
        }

        const out: string | boolean | undefined = options.out;
        const extension: string = chooseExtension(options);
        let cssRelativeFilename: string;
        const baseFilename: string = path.parse(lessFile).name;

        if (typeof out === "string") 
        {
            // out is set: output to the given file name
            // check whether is a folder first
            let interpolatedOut = intepolatePath(out);

            cssRelativeFilename = interpolatedOut;
            let lastCharacter = cssRelativeFilename.slice(-1);
            if (lastCharacter === '/' || lastCharacter === '\\')
            {
                cssRelativeFilename += baseFilename + extension;
            }
            else if (path.extname(cssRelativeFilename) === '')
            {
                cssRelativeFilename += extension;
            }
        }
        else
        {
            // out is not set: output to the same basename as the less file
            cssRelativeFilename = baseFilename + extension;
        }

        const cssFile = path.resolve(lessPath, cssRelativeFilename);
        delete options.out;

        // sourceMap
        let sourceMapFile: string;
        if (options.sourceMap)
        {
            // currently just has support for writing .map file to same directory
            const lessPath: string = path.parse(lessFile).dir;
            const cssPath: string = path.parse(cssFile).dir;
            const lessRelativeToCss: string = path.relative(cssPath, lessPath);

            const sourceMapOptions = {
                outputSourceFiles: false,
                sourceMapBasepath: lessPath,
                sourceMapFileInline: options.sourceMapFileInline,
                sourceMapRootpath: lessRelativeToCss,
                sourceMapURL: '',
            };

            if (!sourceMapOptions.sourceMapFileInline)
            {
                sourceMapFile = cssFile + '.map';
                // sourceMapOptions.sourceMapURL = "./" + baseFilename + extension + ".map";
            }
            options.sourceMap = sourceMapOptions;
        }

        // plugins
        options.plugins = [];
        if (options.sass2less !== false)
        {
            const LessPluginSass2less = require('less-plugin-sass2less');
            // const sass2lessPlugin = new LessPluginSass2less();
            options.plugins.push(LessPluginSass2less);
        }

        if (options.autoprefixer)
        {
            const LessPluginAutoPrefix = require('less-plugin-autoprefix');
            const browsers: string[] = cleanBrowsersList(options.autoprefixer);
            const autoprefixPlugin = new LessPluginAutoPrefix({ browsers });

            options.plugins.push(autoprefixPlugin);
        }

        if (options.groupmedia)
        {
            const LessPluginGroupMedia = require('./lessPluginGroup');
            const lessGroupPlugin = new LessPluginGroupMedia();
            options.plugins.push(lessGroupPlugin);
        }

        if (options.compress)
        {
            options.compress = false;
            const LessPluginCleanCSS = require('less-plugin-clean-css');
            const cleanCSSPlugin = new LessPluginCleanCSS({advanced: true});
            options.plugins.push(cleanCSSPlugin);
        }

        // set up the parser
        return less.render(content, options).then(output =>
        {
                        
            if (output.map && sourceMapFile){
                const mapFileUrl: string = path.basename(sourceMapFile);
                output.css += '/*# sourceMappingURL='+mapFileUrl+' */';
            }

            return writeFileContents(cssFile, output.css).then(() =>
            {
                if (output.map && sourceMapFile)
                {
                    return writeFileContents(sourceMapFile, output.map);
                }
            });
        });
    });
}

function cleanBrowsersList(autoprefixOption: string | string[]): string[]
{
    let browsers: string[];
    if (Array.isArray(autoprefixOption))
    {
        browsers = autoprefixOption;
    }
    else 
    {
        browsers = ("" + autoprefixOption).split(/,|;/);
    }

    return browsers.map(browser => browser.trim());
}

function intepolatePath(this: void, path: string): string
{
    if(vscode.workspace.rootPath)
        return (<string>path).replace(/\$\{workspaceRoot\}/g, vscode.workspace.rootPath);
    return path;
}

function resolveMainFilePaths(this: void, main: string | string[], lessPath: string, currentLessFile: string): string[]
{
    let mainFiles: string[];
    if (typeof main === "string")
    {
        mainFiles = [main];
    }
    else if (Array.isArray(main))
    {
        mainFiles = main;
    }
    else
    {
        mainFiles = [];
    }

    const interpolatedMainFilePaths: string[] = mainFiles.map(mainFile => intepolatePath(mainFile));
    const resolvedMainFilePaths: string[] = interpolatedMainFilePaths.map(mainFile => path.resolve(lessPath, mainFile));
    if (resolvedMainFilePaths.indexOf(currentLessFile) >= 0)
    {
        return []; // avoid infinite loops
    }

    return resolvedMainFilePaths;
}

// writes a file's contents in a path where directories may or may not yet exist
function writeFileContents(this: void, filepath: string, content: any): Promise<any>
{
    return new Promise((resolve, reject) =>
    {
        mkpath(path.dirname(filepath), err =>
        {
            if (err)
            {
                return reject(err);
            }

            fs.writeFile(filepath, content, err => err ? reject(err) : resolve());
        });
    });
}

function readFilePromise(this: void, filename: string): Promise<Buffer> 
{
    return new Promise((resolve, reject) =>
    {
        fs.readFile(filename, (err: any, buffer: Buffer) =>
        {
            if (err) 
            {
                reject(err)
            }
            else
            {
                resolve(buffer);
            }
        });
    });
}

function chooseExtension(this: void, options): string
{
    if (options && options.outExt)
    {
        if (options.outExt === "")
        {
            // special case for no extension (no idea if anyone would really want this?)
            return "";
        }

        return ensureDotPrefixed(options.outExt) || DEFAULT_EXT;
    }

    return DEFAULT_EXT;
}

function ensureDotPrefixed(this: void, extension: string): string
{
    if (extension.startsWith("."))
    {
        return extension;
    }

    return extension ? `.${extension}` : "";
}

function getSubFiles(parent, file, excludePaths){
    let dirList = fs.readdirSync(parent);
    let paths:string[] = [];
    dirList.forEach(function(item){
        let p = path.join(parent, item);
        if(excludePaths.indexOf(p)<0){
            p = path.join(p, file);
            if(fs.existsSync(p)){
                paths.push(p);
            }
        }
    });
    return paths;
}

function promiseChainer(lastPromise: Promise<void>, nextPromise: Promise<void>): Promise<any>{
    lastPromise.then(() => nextPromise);
    return nextPromise;
}

function compilenext(filePath, defaults, lastPromise): Promise<any>{
    const mainPath: path.ParsedPath = path.parse(filePath);
    const mainRootFileInfo = Configuration.getRootFileInfo(mainPath);
    const mainDefaults = extend({}, defaults, { rootFileInfo: mainRootFileInfo });
    const compilePromise = compile(filePath, mainDefaults);
    if (lastPromise)
    {
        lastPromise = promiseChainer(lastPromise, compilePromise);
    }
    else
    {
        lastPromise = compilePromise;
    }
    return lastPromise;
}