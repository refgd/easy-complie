# easy-compile README

Easily work with LESS/SASS/SCSS/TYPESCRIPT files in Visual Studio Code.

"Compile-on-save" for LESS/SASS/SCSS/TypeScript files without using a build task.

## Features

  * Compile TypeScript and Less/Sass/Scss on save
  * Support autoprefixer for Less/Sass/Scss
  * Support mearge all media queries
  * Support inline setting (Only for Complie)
  * minify .js and .css files

## Usage

### Complie
  For TypeScript, Only compile after you setup _outfile_ or _outdir_.

### Minify
  Run Command "Minify - Easy Complie" to minify files

## Extension Settings

### Settting
  easycompile.sass {}

  easycompile.less {}

  easycompile.typescript {}

  easycompile.css {}

  easycompile.js {}

### Inline Setting (Only work for Complie)
  * Settings can also be specified per file as a comment on the _first_ line.
  * Settings are comma-separated and strings are _not_ "quoted".
  * Example:

    ```less
    // out: ../dist/app.css, compress: true, sourceMap: false, autoprefixer: last 5 versions, groupmedia: true
    
    body, html {
        ...
    }
    ```

    ```typescript
    // outdir: ../../
    
    import * ...
    ...
    ```

  ### Tips
  You can set "groupmedia: true" for Less/Sass/Scss, to mearge all media queries


-----------------------------------------------------------------------------------------------------------

## Acknowledgements
* Configuration concepts borrowed from [mrcrowl's](#https://github.com/mrcrowl) [vscode-easy-less](https://github.com/mrcrowl/vscode-easy-less).

**Enjoy!**