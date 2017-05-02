# Change Log
### 1.0.0

Initial release

### 1.0.1

Add minify functions for JS and CSS

### 1.0.2

Add surround option to minify js.
  * Example:
    ```json
    "easycompile.js": {
      "surround": "(function (define){ ${code} })(define)"
    }
    ```

### 1.0.3
Include "Workspace Root/node_modules/@types" with typescript compiler