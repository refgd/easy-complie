import * as sassCompiler from 'sass.js';
import * as mkpath from 'mkpath';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

import * as Configuration from "../../Configuration";
import * as FileOptionsParser from "../../FileOptionsParser";

const DEFAULT_EXT = ".css";

// compile the given sass file
export function compile(sassFile: string, defaults): Promise<void>
{
    return readFilePromise(sassFile).then(buffer =>
    {
        const content: string = buffer.toString();
        const options = FileOptionsParser.parse(content, defaults);
        const sassPath: string = path.dirname(sassFile);

        // main is set: compile the referenced file instead
        if (options.main)
        {
            const mainFilePaths: string[] = Configuration.resolveMainFilePaths(options.main, sassPath, sassFile);
            if(!options.exclude) options.exclude = [];
            if(options.excludes) options.exclude = Object.assign([], options.exclude, options.excludes);
            const excludePaths: string[] = Configuration.resolveMainFilePaths(options.exclude, sassPath, sassFile);
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
        const baseFilename: string = path.parse(sassFile).name;

        if (typeof out === "string") 
        {
            // out is set: output to the given file name
            // check whether is a folder first
            let interpolatedOut = Configuration.intepolatePath(out);

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

        const cssFile = path.resolve(sassPath, cssRelativeFilename);
        const cssPath: string = path.parse(cssFile).dir;
        delete options.out;
        //need change "module.exports = factory()" to "module.exports = factory" in node_modules/sass.js/dist/sass.sync.js to make this work
        const sass = new sassCompiler();
        let opts = {
            style: sass.style.expanded
        };

        let sourceMapFile: string;
        let replaceList:any = {
            "stdin": path.relative(cssPath, sassFile)
        };
        if (options.sourceMap)
        {
            const sassRelativeToCss: string = path.relative(cssPath, sassPath);

            const sourceMapOptions = {
                sourceMapContents: false,
                sourceMapEmbed: options.sourceMapFileInline,
                sourceMapRoot: sassRelativeToCss
                // inputPath: path.basename(sassFile)
            };

            if(!options.sourceMapFileInline){
                sourceMapFile = cssFile + '.map';
            }

            opts = Object.assign({}, opts, sourceMapOptions);
        }

        sass._path = '/'+sassPath.replace(/\\/g, '/').replace(/\:/g, '')+'/';
        sass.importer(function(request, done) {
            if (request.path) {
                done();
            }else{
                let requestedPath = sassPath;
                if(request.previous != 'stdin')
                    requestedPath = path.resolve(sassPath, path.dirname(request.previous));
                let paths = getPathVariations(request.current);
                let x, file;
                for(x in paths){
                    let realPath = path.resolve(requestedPath, paths[x]);
                    if(fileExists(realPath)){
                        file = realPath;
                        break;
                    }
                }
                if (!file) {
                    done({
                        error: 'File "' + request.current + '" not found',
                    });
                    return;
                }

                readFilePromise(file).then(buffer =>
                {
                    replaceList[request.current] = path.relative(sassPath, file);
                    const content: string = buffer.toString();
                    sass.writeFile(request.resolved, content, function() {
                        done({
                            path: replaceList[request.current],
                            content: content
                        });
                    });
                }).catch((error: any) =>
                {
                    done({
                        error: error.message,
                    });
                });
            }
          });
        
        return new Promise<any>((resolve, reject) =>
            {
                sass.compile(content, opts, result => {
                    if(result.status == 1){
                        result.sass = sass;
                        reject(result);
                    }else{
                        let css = result.text;
                        let sourceMap;
                        if(css){
                            if (options.autoprefixer)
                            {
                                const LessPluginAutoPrefix = require('less-plugin-autoprefix');
                                const browsers: string[] = cleanBrowsersList(options.autoprefixer);
                                const autoprefixPlugin = new LessPluginAutoPrefix({ browsers });
        
                                autoprefixPlugin.install(result, {
                                    addPostProcessor: function (postProcessor){
                                        css = postProcessor.process(css, {});
                                    }
                                });
                            }
        
                            if (options.groupmedia)
                            {
                                const SassPluginGroupMedia = require('../../plugins/pluginGroup');
                                const sassGroupPlugin = new SassPluginGroupMedia();
        
                                sassGroupPlugin.install(result, {
                                    addPostProcessor: function (postProcessor){
                                        css = postProcessor.process(css, {});
                                    }
                                });
                            }
        
                            if (options.compress)
                            {
                                options.compress = false;
                                const LessPluginCleanCSS = require('../../plugins/pluginCleanCss');
                                const cleanCSSPlugin = new LessPluginCleanCSS({advanced: true});
        
                                cleanCSSPlugin.install(result, {
                                    addPostProcessor: function (postProcessor){
                                        css = postProcessor.process(css, {sourceMap: result.map?{
                                            getExternalSourceMap: function(){
                                                return JSON.stringify(result.map)
                                            },
                                            setExternalSourceMap: function(map){
                                                result.map = JSON.parse(map);
                                            },
                                        }:false, options: options});
                                    }
                                });
                            }
                            if (options.sourceMap && result.map){
                                sourceMap = result.map;
                                let x;
                                for(x in sourceMap.sources){
                                    let path = sourceMap.sources[x];
                                    if(replaceList[path]) sourceMap.sources[x] = replaceList[path];
                                }

                                if(sourceMapFile){
                                    const mapFileUrl: string = path.basename(sourceMapFile);
                                    css += "\n"+'/*# sourceMappingURL='+mapFileUrl+' */';
                                }else{
                                    css += "\n"+'/*# sourceMappingURL=data:application/json;charset=utf-8;base64,'+Buffer.from(JSON.stringify(sourceMap)).toString("base64")+'  */';
                                }
                            }
                        }else{
                            css = "";
                        }
                        
                        return writeFileContents(cssFile, css).then(() =>
                        {
                            if (sourceMap && sourceMapFile)
                            {                                
                                return writeFileContents(sourceMapFile, JSON.stringify(sourceMap)).then(() => {
                                    resolve(sass);
                                });
                            }else{
                                resolve(sass);
                            }
                        });
                    }
                });
            });
    });
}

function fileExists(path) {
    try {
        var stat = fs.statSync(path);
        return stat && stat.isFile();
    }catch(err) {
    }
    return false;
}

function getPathVariations(currentPath) {
    // [importer,include_path] this is where we would add the ability to
    // examine the include_path (if we ever use that in Sass.js)
    currentPath = path.normalize(currentPath);
    var directory = path.dirname(currentPath);
    
    var basename = path.basename(currentPath);
    var extensions = ['.scss', '.sass', '.css'];
    // basically what is done by resolve_and_load() in file.cpp
    // Resolution order for ambiguous imports:
    var list = [
      // (1) filename as given
      currentPath,
      // (2) underscore + given
      directory + '\\_' + basename
    ].concat(extensions.map(function(extension) {
      // (3) underscore + given + extension
      return directory + '\\_' + basename + extension;
    })).concat(extensions.map(function(extension) {
      // (4) given + extension
      return directory + '\\' + basename + extension;
    }));
  
    return list;
  };


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
    const mainDefaults = Object.assign({}, defaults, { rootFileInfo: mainRootFileInfo });
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