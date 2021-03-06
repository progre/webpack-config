const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const uglifySaveLicense = require('uglify-save-license');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

function getTSLoader(isProduction) {
  return {
    rules: [{
      test: /\.tsx?$/,
      use: [
        {
          loader: 'ts-loader',
          options: {
            compilerOptions: { sourceMap: !isProduction },
            onlyCompileBundledFiles: true,
          }
        }
      ]
    }]
  };
}

function getCommon(isProduction) {
  return {
    devtool: isProduction ? false : 'inline-source-map',
    module: getTSLoader(isProduction),
    node: { __dirname: false, __filename: true },
    resolve: { extensions: ['.ts', '.tsx', '.js'] },
    watchOptions: { ignored: /node_modules|dist/ },
  };
}

function createUglifyJsPlugin() {
  return new UglifyJsPlugin({
    uglifyOptions: { output: { comments: uglifySaveLicense } },
  });
}

function createCopyWebpackPlugin(path) {
  return new CopyWebpackPlugin(
    [{ from: `src/${path}`, to: path }],
    { ignore: ['test/', '*.ts', '*.tsx'] },
  );
}

function toEntry(entriesPath, entries) {
  return entries.reduce(
    (p, c) => ({
      ...p,
      [path.basename(c, path.extname(c))]: `./src/${entriesPath}/${c}`,
    }),
    {},
  );
}

/**
 * @param {boolean} isProduction
 * @param {string} entriesPath 'path/to/'
 * @param {string[]} entries ['file.ts']
 * @param {string?} copyPath
 */
function client(isProduction, entriesPath, entries, copyPath) {
  return {
    ...getCommon(isProduction),
    entry: toEntry(entriesPath, entries),
    output: { filename: `${entriesPath}/[name].js` },
    plugins: [
      ...(
        copyPath == null ? [] : [createCopyWebpackPlugin(copyPath)]
      ),
      ...(
        !isProduction ? [] : [createUglifyJsPlugin()]
      ),
    ],
    target: 'web',
  };
}

/**
 * @param {boolean} isProduction
 * @param {string} entriesPath 'path/to/'
 * @param {string[]} entries ['file.ts']
 */
function server(isProduction, entriesPath, entries) {
  return {
    ...getCommon(isProduction),
    entry: toEntry(entriesPath, entries),
    externals: /^(?!\.)/,
    output: { filename: `${entriesPath}/[name].js`, libraryTarget: 'commonjs2' },
    target: 'node',
  };
}

/**
 * @param {boolean} isProduction
 * @param {string} entriesPath 'path/to/'
 * @param {string[]} entries ['file.ts']
 * @param {string} copyPath
 */
function electronRenderer(isProduction, entriesPath, entries, copyPath) {
  return {
    ...client(isProduction, entriesPath, entries, copyPath),
    externals: /^electron$/,
    output: { filename: `${entriesPath}/[name].js`, libraryTarget: 'commonjs2' },
    target: 'electron-renderer',
  };
}

/**
 * @param {boolean} isProduction
 * @param {string} entriesPath 'path/to/'
 * @param {string[]} entries ['file.ts']
 */
function electronMain(isProduction, entriesPath, entries) {
  return {
    ...server(isProduction, entriesPath, entries),
    output: { filename: `${entriesPath}/[name].js`, libraryTarget: 'commonjs2' },
    target: 'electron-main',
  };
}

module.exports = { client, server, electronRenderer, electronMain };
