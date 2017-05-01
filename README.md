# easy-compile README

Easily work with LESS and TYPESCRIPT files in Visual Studio Code.

"Compile-on-save" for LESS stylesheets and TypeScript files without using a build task.

## Features

  * Compile TypeScript and Less on save
  * minify .js and .css files

## Usage

### Complie
  For TypeScript, Only compile after you setup _outfile_ or _outdir_.

### Minify
  Run Command "Minify - Easy Complie" to minify files

## Extension Settings

### Settting
  easycompile.less {}
  easycompile.typescript {}
  easycompile.css {}
  easycompile.js {}

### Inline Setting (Only work for Complie)
  * Settings can also be specified per file as a comment on the _first_ line.
  * Settings are comma-separated and strings are _not_ "quoted".
  * Example:

    ```less
    // out: ../dist/app.css, compress: true, sourceMap: false
    
    body, html {
        ...
    }
    ```

    ```typescript
    // outdir: ../../
    
    import * ...
    ...
    ```
## Release Notes

### 1.0.0

Initial release

### 1.0.1

Add minify functions for JS and CSS

-----------------------------------------------------------------------------------------------------------

## Acknowledgements
* Configuration concepts borrowed from [mrcrowl's](#https://github.com/mrcrowl) [vscode-easy-less](https://github.com/mrcrowl/vscode-easy-less).

**Enjoy!**