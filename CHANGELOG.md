# Change Log
### 1.1.4
Upgrade dependencies
Speed up extension
Fix sass/scss inline source map ([#19])

### 1.1.2
Upgrade Less complier to 3.8.1 ([#15])

### 1.1.1
Add minify on save option ([#1])
Integrate sass2less plugin. ([#12])
Fix sass/scss compile bug ([#9])

### 1.1.0
Fix compiler empty file throw error
Fix sass/scss can not importing files from parent folder

### 1.0.9
Fix sass/scss import files ([#2])

### 1.0.8
Fix sass import and sourceMap

### 1.0.7
Clean cache after sass/scss compile

### 1.0.6
Add sass/scss compile support

### 1.0.5
suport '*' in main option

### 1.0.4
Add compress option for TSCompiler

### 1.0.3
Include "Workspace Root/node_modules/@types" with typescript compiler

### 1.0.2

Add surround option to minify js.
  * Example:
    ```json
    "easycompile.js": {
      "surround": "(function (define){ ${code} })(define)"
    }
    ```

### 1.0.1

Add minify functions for JS and CSS

### 1.0.0

Initial release
