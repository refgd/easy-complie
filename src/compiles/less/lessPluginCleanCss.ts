var CleanCSS = require("clean-css");

function getCleanCSSProcessor(less) {
    function CleanCSSProcessor(options) {
        this.options = options || {};
    }

    CleanCSSProcessor.prototype = {
        process: function (css, extra) {
            var options = this.options,
                sourceMap = extra.sourceMap,
                sources,
                sourcesContent;

            if (sourceMap) {
                options.sourceMap = sourceMap.getExternalSourceMap();
                if (options.sourceMap) {
                    options.sourceMap = options.sourceMap.toString();
                    var sourceMapObj = JSON.parse(options.sourceMap);
                    if (sourceMapObj.sourcesContent) {
                        sourcesContent = sourceMapObj.sourcesContent;
                        sources = sourceMapObj.sources;
                    }
                }
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

            var output = new CleanCSS(options).minify(css);

            if (sourceMap) {
                if (sourcesContent) {
                    for (var source = 0; source < sources.length; source++) {
                        output.sourceMap.setSourceContent(sources[source], sourcesContent[source]);
                    }
                }
                sourceMap.setExternalSourceMap(JSON.stringify(output.sourceMap));
            }

            var css = output.styles;
            if (sourceMap) {
                var sourceMapURL = sourceMap.getSourceMapURL();
                css += sourceMap.getCSSAppendage();
            }

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

function LessPluginCleanCss(options) {
    this.options = options;
}

LessPluginCleanCss.prototype = {
    install: function(less, pluginManager) {
        var CleanCSSProcessor = getCleanCSSProcessor(less);
        pluginManager.addPostProcessor(new CleanCSSProcessor(this.options));
    },
    setOptions: function(options) {
        this.options = parseOptions(options);
    },
    minVersion: [2, 1, 0]
};

module.exports = LessPluginCleanCss;