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

  easycompile.css {  

  &emsp;`"outDir": { string }`
  * Redirect output to a different folder  
  * support ${workspaceRoot}

  &emsp;`"outExt": { string }`
  * allows you to specify an alternative output file extension
  * e.g. `.min.css` instead of `.css`

  &emsp;`"autoprefixer": { string }`
  * this enables the [autoprefixer plugin](https://github.com/postcss/autoprefixer) (included)
  * e,g. `> 5%; last 2 Chrome versions; not ie 6-9`

  &emsp;`"groupmedia": { boolean }`
  * This enables the [group media queries plugin](https://github.com/Se7enSky/group-css-media-queries) (included) 

  &emsp;`"sourceMap": { boolean }`

  &emsp;`"sourceMapFileInline": { boolean }`
  
  }

  easycompile.js {

  &emsp;`"outDir": { string }`
  * Redirect output to a different folder  
  * support ${workspaceRoot}

  &emsp;`"outExt": { string }`
  * allows you to specify an alternative output file extension
  * e.g. `.min.js` instead of `.js`
  
  &emsp;`"surround": { string }`
  * put string surround the code
  * default: `(function (define){ ${code} })(define)`

  &emsp;`"compress": { object }`
  * implement UglifyJS Compress setting [[compress-options](https://github.com/mishoo/UglifyJS2#compress-options)]

  }

### Inline Setting (Only work for Less/Sass/Scss/Typescript)
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

### Settings[Less/Scss/Sass]
`main: { filepath: string | string[] }`
 * Compiles a different less file _instead_ of this one.
 * All other settings are ignored.
 * Filepath is relative to the current file.
 * Multiple main files can be specified (see [FAQ](#faq)).
 
`out: { boolean | filepath: string | folderpath: string }`
 * Redirects the css output to a different file.  
 * This setting can be used to override a project-wide `"out": false` setting, where you only want certain `.less` files to be generated.    
 * If filepath is used, but no file extension is specified, it will append `.css`
 * If folderpath is used, the less filename will be used, but with the `.css` extension
 * Filepath is relative to the current file.

 `outExt: { string }`
 * The default output extension is `.css`.
 * This allows you to specify an alternative output file extension (e.g. `.wxss` instead of `.css`)
 * This applies to the `.map` file also (e.g. `.wxss.map`)

`compress: { boolean }` 
 * Compresses the css output by removing surplus white-space.

`autoprefixer: { string | string[] }` 
 * When present, this enables the [autoprefixer plugin](https://github.com/postcss/autoprefixer) (included).  
 * This plugin automatically adds/removes vendor-prefixes needed to support a set of browsers which you specify.
 * The `autoprefixer` option _is_ the comma-separated list of `browsers` for autoprefixer to use (or alternatively a string array of them).
 * See [browserslist](https://github.com/ai/browserslist#queries) documentation for further examples of browser queries.
 * **NOTE**: If used with the inline setting, the browsers listed _must_ be unquoted and semi-colon separated (because comma is already the directive separator): e.g.<br/>
   `// autoprefixer: > 5%; last 2 Chrome versions; not ie 6-9, sourceMap: true, out: ../css/style.css`

`groupmedia: { boolean }` 
 * This enables the [group media queries plugin](https://github.com/Se7enSky/group-css-media-queries) (included).


 ### Tips
 * Ignore files
    ```json
    "easycompile.compile": {
      "ignore" : [
          "**/_*.scss"
      ]
    }
    ```
* Enable minify on save
  ```json
  "easycompile.compile": {
    "minifyJsOnSave": true,
    "minifyCssOnSave": true
  }
  ```


-----------------------------------------------------------------------------------------------------------

## Acknowledgements
* Configuration concepts borrowed from [mrcrowl's](#https://github.com/mrcrowl) [vscode-easy-less](https://github.com/mrcrowl/vscode-easy-less).

**Enjoy!**