var CleanCSS = require("clean-css");

function getCleanCSSProcessor(less) {
    function CleanCSSProcessor(options) {
        this.options = options || {};
    }

    CleanCSSProcessor.prototype = {
        process: function (css, extra) {
            var options = this.options,
                sourceMap = extra.sourceMap,
                filename = '$stdin',
                sourceMapContent;

            if(extra.options && extra.options.rootFileInfo){
                filename = extra.options.rootFileInfo.filename;
            }

            if (typeof options.keepSpecialComments === "undefined") {
                options.keepSpecialComments = "*";
            }
            options.processImport = false;

            if (typeof options.rebase === "undefined") {
                options.rebase = false;
            }

            if (typeof options.advanced === "undefined") {
                options.advanced = false;
            }

            if (sourceMap) {
                sourceMapContent = sourceMap.getExternalSourceMap();

                if (filename && sourceMapContent) {
                    options.sourceMap = true;
                    var sourceMapObj = JSON.parse(sourceMapContent);
                    for (const key in sourceMapObj.sources) {
                        if(sourceMapObj.sources[key] == filename){
                            sourceMapObj.sources[key] = '$stdin';
                        }
                    }
                    sourceMapContent = JSON.stringify(sourceMapObj);
                }
            }

            var output;
            if(options.sourceMap && sourceMapContent){
                output = new CleanCSS(options).minify(css, sourceMapContent);
            }else{
                output = new CleanCSS(options).minify(css);
            }

            if (options.sourceMap) {
                var sourceMapObj = JSON.parse(output.sourceMap);
                for (const key in sourceMapObj.sources) {
                    if(sourceMapObj.sources[key] == '$stdin'){
                        sourceMapObj.sources[key] = filename;
                    }
                }

                sourceMap.setExternalSourceMap(JSON.stringify(sourceMapObj));
            }

            var css = output.styles;

            return css;
        }
    };

    return CleanCSSProcessor;
}

function parseOptions(options) {
    if (typeof options === "string") {
        var cleanOptionArgs = options.split(" ");
        options = {};

        for (var i = 0; i < cleanOptionArgs.length; i++) {
            var argSplit = cleanOptionArgs[i].split("="),
                argName = argSplit[0].replace(/^-+/, "");

            switch (argName) {
                case "keep-line-breaks":
                case "b":
                    options.keepBreaks = true;
                    break;
                case "s0":
                    options.keepSpecialComments = 0;
                    break;
                case "s1":
                    options.keepSpecialComments = 1;
                    break;
                case "keepSpecialComments":
                    var specialCommentOption:any = argSplit[1];
                    if (specialCommentOption !== "*") {
                        specialCommentOption = Number(specialCommentOption);
                    }
                    options.keepSpecialComments = specialCommentOption;
                    break;
                // for compatibility - does nothing
                case "skip-advanced":
                    options.advanced = false;
                    break;
                case "advanced":
                    options.advanced = true;
                    break;
                case "skip-rebase":
                    options.rebase = false;
                    break;
                case "rebase":
                    options.rebase = true;
                    break;
                case "skip-aggressive-merging":
                    options.aggressiveMerging = false;
                    break;
                case "skip-restructuring":
                    options.restructuring = false;
                    break;
                case "skip-shorthand-compacting":
                    options.shorthandCompacting = false;
                    break;
                case "c":
                case "compatibility":
                    options.compatibility = argSplit[1];
                    break;
                case "rounding-precision":
                    options.roundingPrecision = Number(argSplit[1]);
                    break;
                default:
                    throw new Error("unrecognised clean-css option '" + argSplit[0] + "'");
            }
        }
    }
    return options;
}

function pluginCleanCss(options) {
    this.options = options;
}

pluginCleanCss.prototype = {
    install: function(less, pluginManager) {
        var CleanCSSProcessor = getCleanCSSProcessor(less);
        pluginManager.addPostProcessor(new CleanCSSProcessor(this.options));
    },
    setOptions: function(options) {
        this.options = parseOptions(options);
    },
    minVersion: [2, 1, 0]
};

module.exports = pluginCleanCss;