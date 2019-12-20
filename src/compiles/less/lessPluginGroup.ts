var grouper = require('group-css-media-queries');

function getSessGroupProcessor(less) {
	function GroupProcessor() { };
    GroupProcessor.prototype = {
        process: function (css, extra) {
            return grouper(css);
        }
    };

    return GroupProcessor;
};

function LessPluginGroupMediaQuery() {}

LessPluginGroupMediaQuery.prototype = {
    install: function(less, pluginManager) {
		var GroupProcessor = getSessGroupProcessor(less);
        pluginManager.addPostProcessor(new GroupProcessor());
    },
    printUsage: function () {
    },
    minVersion: [2, 0, 0]
};

module.exports = LessPluginGroupMediaQuery;