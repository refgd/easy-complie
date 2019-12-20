var grouper = require('group-css-media-queries');

function getSassGroupProcessor(sass) {
	function GroupProcessor() { };
    GroupProcessor.prototype = {
        process: function (css, extra) {
            return grouper(css);
        }
    };

    return GroupProcessor;
};

function SassPluginGroupMediaQuery() {}

SassPluginGroupMediaQuery.prototype = {
    install: function(sass, pluginManager) {
		var GroupProcessor = getSassGroupProcessor(sass);
        pluginManager.addPostProcessor(new GroupProcessor());
    },
    printUsage: function () {
    },
    minVersion: [2, 0, 0]
};

module.exports = SassPluginGroupMediaQuery;