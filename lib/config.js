/**
 * @file This module handles configuration resolution for the **YTMP3-JS** project.
 *
 * This module offers a parser and resolver for the configuration file of YTMP3-JS,
 * which can parse both JSON and JS configuration file (support both CommonJS and
 * ES module). You can see the {@link module:config~KNOWN_CONFIG_EXTS `KNOWN_CONFIG_EXTS`}
 * constant to check the supported configuration file's extension names.
 *
 * The {@link module:config~parseConfig `parseConfig`} function will parse
 * and optionally resolve the configuration file containing the download options
 * and audio converter options (if defined). Before being resolved, the configuration
 * file will be validated first and will throws a {@link InvalidTypeError} if any known
 * configuration options has an invalid type, or throws a {@link UnknownOptionError} if
 * there is an unknown option defined within the configuration object (see the
 * {@link module:config~KNOWN_OPTIONS `KNOWN_OPTIONS`}).
 *
 * @example <caption> JSON Configuration File (<code>ytmp3-js.json</code>) </caption>
 * {
 *   "downloadOptions": {
 *     "outDir": "/path/to/download/folder",
 *     "quiet": false,
 *     "convertAudio": true,
 *     "converterOptions": {
 *       "format": "opus",
 *       "codec": "libopus",
 *       "channels": 1,
 *       "deleteOld": true
 *     }
 *   }
 * }
 *
 * @example <caption> CommonJS Module Configuration File (<code>ytmp3-js.config.cjs</code>) </caption>
 * module.exports = {
 *   downloadOptions: {
 *     outDir: '..',
 *     convertAudio: false,
 *     quiet: true
 *   }
 * }
 *
 * @example <caption> ES Module Configuration File (<code>ytmp3-js.config.mjs</code>) </caption>
 * export default {
 *   downloadOptions: {
 *     cwd: process.env.HOME,
 *     outDir: 'downloads',  // $HOME/downloads
 *     convertAudio: true
 *   },
 *   audioConverterOptions: {
 *     format: 'mp3',
 *     codec: 'libmp3lame',
 *     frequency: 48000,
 *     bitrate: '128k'
 *     deleteOld: true
 *   }
 * }
 *
 * @module    config
 * @requires  ytmp3
 * @requires  audioconv
 * @requires  utils
 * @requires  {@link https://npmjs.com/package/lsfnd npm:lsfnd}
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     1.0.0
 */

/**
 * A typedef representating the configuration object containing options to configure
 * the both download and audio conversion process.
 *
 * @typedef  {Object} YTMP3Config
 * @property {DownloadOptions} downloadOptions
 *           Options related to the download process.
 * @property {ConvertAudioOptions} [audioConverterOptions]
 *           Options related to the audio conversion process, if not defined in
 *           `downloadOptions`. This field will be ignored if the `downloadOptions.converterOptions`
 *           property are defined and not contains a nullable value.
 *
 * @global
 * @since  1.0.0
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const util = require('node:util');
const { ls, lsTypes } = require('lsfnd');

const ytmp3 = require('./ytmp3');
const {
  YTMP3_HOMEDIR,
  isNullOrUndefined,
  isObject,
  isPlainObject,
  getType
} = require('./utils');
const {
  resolveOptions: resolveACOptions
} = require('./audioconv');
const {
  UnknownOptionError,
  InvalidTypeError,
  GlobalConfigParserError
} = require('./error');

/**
 * An array containing all known configuration file's extension names.
 *
 * **Deprecation Note**:  
 * For extensions such as, `.js`, `.cjs` and `.mjs`, needs to be concatenated with `.config`
 * to prevent config file lookup confusion in the future. At this time, we won't deleted those
 * extension names until next major update, but please consider to change your configuration file's
 * extension for future compatibility.
 *
 * @type {Readonly<Array<('.js' | '.cjs' | '.mjs' | '.config.js' | '.config.mjs' | '.config.cjs' | '.json')>>}
 * @readonly
 * @default
 * @package
 * @since  1.0.0
 */
const KNOWN_CONFIG_EXTS = Object.freeze([
  '.js', '.cjs', '.mjs',  // ! DEPRECATED: Will be removed on next major update
  '.config.js', '.config.mjs', '.config.cjs',
  '.json'
]);
/**
 * An array containing all known configuration options.
 *
 * @type {Readonly<Array<('downloadOptions' | 'audioConverterOptions')>>}
 * @readonly
 * @default
 * @package
 * @since  1.0.0
 */
const KNOWN_OPTIONS = Object.freeze([ 'downloadOptions', 'audioConverterOptions' ]);
/**
 * A string representating the format of error message.
 * Can be formatted using `util.format()` function.
 *
 * First occurrence of `'%s'` will be intepreted as error message, the second
 * as the directory name of configuration file, and the third one as the base name
 * of the configuration file.
 *
 * @type {string}
 * @constant
 * @default '%s\n\tat \x1b[90m%s\n\x1b[1;91m%s\x1b[0m\n'
 * @package
 * @since   1.0.0
 */
const ERR_FORMAT = '%s\n\tat \x1b[90m%s\n\x1b[1;91m%s\x1b[0m\n';

/**
 * Resolves the configuration for YTMP3-JS from a given configuration object.
 *
 * This function takes a configuration object typically sourced from a config file
 * (e.g., `ytmp3-js.config.js`) and ensures that it adheres to the expected structure
 * and types. It specifically resolves the download options and the audio converter
 * options, providing fallbacks and handling type checks.
 *
 * @param {Object} params - The parameters for the function.
 * @param {YTMP3Config} params.config - The configuration object to be resolved.
 * @param {string} params.file - The file path from which the config object was sourced,
 *                               used for error reporting.
 *
 * @returns {DownloadOptions} The resolved download options and audio converter
 *                            options if provided.
 *
 * @throws {InvalidTypeError} If any known options is not object type.
 *
 * @package
 * @since   1.0.0
 */
function resolveConfig({ config, file }) {
  if (isNullOrUndefined(config) || !isObject(config)) return {};
  // Set file to 'unknown' if given file is null or not a string type
  if (isNullOrUndefined(file) || typeof file !== 'string') file = 'unknown';

  // Check and validate the configuration
  configChecker({ config, file });

  // By using this below logic, if user specified with any falsy value
  // or unspecified it will uses the fallback value instead
  let downloadOptions = config.downloadOptions || {};
  let audioConverterOptions;
  if ('converterOptions' in downloadOptions) {
    audioConverterOptions = downloadOptions.converterOptions;
  } else if ('audioConverterOptions' in config) {
    audioConverterOptions = config.audioConverterOptions;
  }

  // Resolve the download options
  downloadOptions = ytmp3.resolveDlOptions({ downloadOptions });
  // Resolve the audio converter options, but all unspecified options will
  // fallback to undefined value instead their default value
  audioConverterOptions = resolveACOptions(audioConverterOptions, false);

  // Assign the `audioConverterOptions` to `downloadOptions`
  Object.assign(downloadOptions, {
    converterOptions: audioConverterOptions
  });
  return downloadOptions;
}

/**
 * Checks the given configuration for validity.
 *
 * This function ensures that the configuration object adheres to the expected structure
 * and types. It checks for unknown fields and validates the types of known options.
 * Throws an error if there any known options is not object type or if there are
 * unknown fields defined in the configuration.
 *
 * @param {Object} params - The parameters for the function.
 * @param {YTMP3Config} params.config - The configuration object to be checked.
 * @param {string} params.file - The file path from which the config object was sourced,
 *                               used for error reporting.
 *
 * @throws {InvalidTypeError} If any known options is not object type.
 * @throws {UnknownOptionError} If there are unknown fields in the configuration.
 *
 * @package
 * @since   1.0.0
 */
function configChecker({ config, file }) {
  if (!config || typeof config !== 'object') {
    throw new InvalidTypeError('Invalid type of configuration object', {
      actualType: getType(config),
      expectedType: getType({})
    });
  }

  file = (file && !path.isAbsolute(file)) ? path.resolve(file) : file;
  const dirFile = path.dirname(file);
  const baseFile = path.basename(file);

  Array.from(Object.keys(config)).forEach(function (field) {
    // Check for unknown field as option within the configuration options
    if (!(Array.from(KNOWN_OPTIONS).includes(field))) {
      throw new UnknownOptionError(util.format(ERR_FORMAT,
        `Unknown configuration field: '${field}' (${typeof config[field]})`,
        dirFile, baseFile
      ));
    }

    // Check for known options have a valid type (object)
    if (isNullOrUndefined(config[field]) || !isObject(config[field])) {
      throw new InvalidTypeError(util.format(ERR_FORMAT,
        `Expected type of field '${field}' is an object`,
        dirFile, baseFile
      ), {
        actualType: getType(field),
        expectedType: getType({})
      });
    }
  });
}

/**
 * Parses a configuration file and either resolves or validates its contents.
 * 
 * This function can handle both CommonJS and ES module formats for configuration files.
 * When importing an ES module, it returns a `Promise` that resolves to the configuration
 * object. It also supports optional resolution of the configuration.
 * 
 * @param {!string} configFile - A string path refers to the configuration file.
 * @param {boolean} [resolve=true] - Determines whether to resolve the configuration object.
 *                                   If set to `false`, will validate the configuration only.
 *
 * @returns {YTMP3Config | DownloadOptions | Promise<(YTMP3Config | DownloadOptions)>}
 *          The configuration object or a `Promise` that fullfilled with the
 *          configuration object if an ES module is imported. The returned configuration
 *          object will be automatically resolved if `resolve` is set to `true`.
 *
 * @throws {InvalidTypeError} If the given `configFile` is not a string.
 * @throws {Error} If the file extension is not supported or if an error occurs during import.
 * 
 * @example <caption> Synchronously parse a CommonJS configuration file </caption>
 * const config = parseConfig('./config.js');
 * console.log(config);
 * 
 * @example <caption> Asynchronously parse an ES module configuration file </caption>
 * parseConfig('./config.mjs').then((config) => {
 *   console.log(config);
 * }).catch((error) => {
 *   console.error('Failed to load config:', error);
 * });
 *
 * @package
 * @since   1.0.0
 * @see     {@link module:config~resolveConfig resolveConfig}
 * @see     {@link module:config~importConfig importConfig}
 *          (alias for <code>parseConfig(config, true)</code>)
 */
function parseConfig(configFile, resolve=true, forceRequire=false) {
  function resolveOrCheckOnly(config) {
    // Attempt to extract the default export (only on ES module) if the configuration
    // object only contains that 'default' property, for clarity:
    //     export default { ... }
    //
    if (isObject(config) && Object.keys(config).length === 1 && 'default' in config) {
      config = config.default;  // Extract the default export
    }
    // Resolve the configuration object if `resolve` is set to true
    if (resolve) config = resolveConfig({ config, file });  // Return {} if null
    // Otherwise, only validate the configuration
    else configChecker({ config, file });
    return config;
  }

  if (!configFile || typeof configFile !== 'string') {
    throw new InvalidTypeError('Expected a string path refers to a configuration file', {
      actualType: getType(configFile),
      expectedType: 'string'
    });
  }

  const file = path.resolve(configFile);  // Copy and resolve path
  let ext = path.extname(configFile);   // Extract the extension name
  ext = path.extname(configFile.replace(new RegExp(`${ext}$`), '')) + ext;

  if (!(KNOWN_CONFIG_EXTS.includes(ext))) {
    throw new Error(`Supported configuration file is: ${
      KNOWN_CONFIG_EXTS.map(x => `'${x}'`).join(' | ')
    }`);
  }

  if (process.platform === 'win32') {
    configFile = (path.win32.isAbsolute(configFile)
      ? configFile
      : path.posix.resolve(configFile.replace(/\//g, path.win32.sep))).trim();
  } else {
    configFile = (path.posix.isAbsolute(configFile)
      ? configFile
      : path.posix.resolve(configFile.replace(/\\/g, path.posix.sep))).trim();
  }

  // Import the configuration file
  let config = null;
  // Only include '.cjs' and '.json' to use require()
  if (['.config.cjs', '.json'].includes(ext) || forceRequire) {
    config = require(configFile);
  } else {
    // On Windows, replace all '\' with '/' to use import()
    if (process.platform === 'win32') {
      configFile = 'file:///' + configFile.replace(/\\/g, '/');
    }
    config = import(configFile);
  }

  if (config instanceof Promise) {
    // Return a Promise if the imported config module is a ES Module
    return new Promise(function (resolve, reject) {
      config
        .then((result) => resolve(resolveOrCheckOnly(result)))
        .catch((err) => reject(err));
    });
  }

  return resolveOrCheckOnly(config);
}

/**
 * An alias for {@link module:config~parseConfig `parseConfig`} function,
 * with `resolve` parameter is set to `true`.
 *
 * @function
 * @param {!string} file - A string path refers to configuration file to import and resolve.
 * @returns {YTMP3Config | DownloadOptions | Promise<(YTMP3Config | DownloadOptions)>}
 *
 * @package
 * @since  1.0.0
 * @see    {@link module:config~parseConfig parseConfig}
 */
const importConfig = (file, forceRequire=false) => parseConfig(file, true, forceRequire);


// region Global Config Parser

/**
 * Asynchronously finds and returns the path to the most appropriate global configuration
 * file for the `ytmp3-js` module.
 *
 * The function searches for configuration files in the user's home directory
 * (specifically, the `~/.ytmp3-js` directory -- for more details, see {@link module:utils~YTMP3_HOMEDIR `YTMP3_HOMEDIR`})
 * and applies a series of prioritization and validation steps to ensure that the returned
 * file is valid and non-empty.
 *
 * The function first retrieves a list of configuration files in the specified directory that 
 * match a set of known file extensions ({@link module:config~KNOWN_CONFIG_EXTS `KNOWN_CONFIG_EXTS`}).
 * If exactly one file is found, its basename is returned immediately. If multiple configuration
 * files are present, the function prioritizes specific configuration file names in the following order:
 *   1. `ytmp3-js.config.cjs`
 *   2. `ytmp3-js.config.mjs`
 *   3. `ytmp3-js.config.js`
 *   4. `ytmp3-js.json`
 *
 * If the prioritized file is empty, the function will iterate through other available files 
 * until it finds a non-empty file or exhausts the list.
 *
 * @param   {string} [YTMP3_HOMEDIR] - The directory from where to search the global configuration file.
 *                                     Defaults to {@link module:utils~YTMP3_HOMEDIR `YTMP3_HOMEDIR`}.
 * @returns {Promise<string | null>}
 *          A promise fullfills with a string representing the absolute path of the selected
 *          configuration file, or `null` if no global configuration file is found or if the
 *          `searchDir` is not exist and not a directory.
 *
 * @async
 * @package
 * @since    1.1.0
 * @see      {@linkcode https://npmjs.com/package/lsfnd npm:lsfnd}
 */
async function findGlobalConfig(searchDir = YTMP3_HOMEDIR) {
  searchDir = (isNullOrUndefined(searchDir) || typeof searchDir !== 'string')
    ? YTMP3_HOMEDIR : searchDir;
  const knownConfigExtsRegex = new RegExp(`${KNOWN_CONFIG_EXTS.join('$|')}$`);

  // Before start searching the config file, we need to check whether the `searchDir`
  // is exist and does not refer to non-directory type
  try {
    const stat = await fs.promises.stat(searchDir);
    if (!stat.isDirectory()) return null;  // Not a directory
  } catch (err) {
    // ENOENT means no such a directory or file
    if (err.code && err.code === 'ENOENT') return null;
    throw err;  // Otherwise throw back the error
  }

  const configs = await ls(searchDir || YTMP3_HOMEDIR, {
    encoding: 'utf8',
    match: knownConfigExtsRegex,
    recursive: false,
    absolute: false,
    basename: true
  }, lsTypes.LS_F);

  // If cannot found any global configuration file, return null instead
  // to indicate that user have not configure the global configuration
  if (!configs || (Array.isArray(configs) && !configs.length)) return null;

  // Return the first index if only found one configuration file
  if (configs.length === 1) return path.join(searchDir, configs[0]);

  const prioritizedConfigs = [
    'ytmp3-js.config.cjs',  // #1
    'ytmp3-js.config.mjs',  // #2
    'ytmp3-js.config.js',   // #3
    'ytmp3-js.json'         // #4
  ];

  let retries = 0;
  let configIndex = configs.indexOf(prioritizedConfigs[retries++]);
  while (!(~configIndex)) {
    if (retries === prioritizedConfigs.length - 1) break;
    configIndex = configs.indexOf(prioritizedConfigs[retries++]);
  }

  // Get the absolute path of the config file
  let configRealPath = path.join(searchDir, configs[configIndex]);
  let configStat = await fs.promises.stat(configRealPath);

  // If the config file is empty, try to find another config file
  retries = 0;  // reset
  while (!configStat.size) {
    if (retries === configs.length) break;
    if (retries === configIndex) {
      retries++;
      continue;
    }
    configRealPath = path.join(searchDir, configs[retries++]);
    configStat = await fs.promises.stat(configRealPath);
  }

  return configRealPath;
}

/**
 * Parses the global configuration file at the specified path with optional parser options.
 *
 * This function validates the type of the configuration file path and parser options, checks
 * if the file is readable, and imports the configuration file. The `forceRequire` option is 
 * enabled if the file extension is `.json` unless overridden by the provided options.
 *
 * @param {string} globConfigPath - The path to the global configuration file. Must be a valid string.
 * @param {Object} [parserOptions] - Optional settings for parsing the configuration file.
 * @param {boolean} [parserOptions.forceRequire] - If `true`, forces the use of `require()` for importing the file,
 *                                                 even if it's an ES module.
 * 
 * @returns {Promise<any>} A promise fullfills with the parsed configuration data.
 * 
 * @throws {InvalidTypeError} If `globConfigPath` is not a string or `parserOptions` is not a plain object.
 * @throws {GlobalConfigParserError} If the configuration file cannot be accessed.
 * 
 * @async
 * @package
 * @since    1.1.0
 */
async function parseGlobalConfig(globConfigPath, parserOptions) {
  if (isNullOrUndefined(globConfigPath) || typeof globConfigPath !== 'string') {
    throw new InvalidTypeError('Unknown configuration file path', {
      actualType: getType(globConfigPath),
      expectedType: 'string'
    });
  }

  parserOptions = isNullOrUndefined(parserOptions) ? {} : parserOptions;
  if (!isPlainObject(parserOptions)) {
    throw new InvalidTypeError('Invalid type of configuration parser options', {
      actualType: getType(parserOptions),
      expectedType: Object.prototype.toString.call({})
    });
  }

  parserOptions = {
    forceRequire: typeof parserOptions.forceRequire === 'boolean'
      ? parserOptions.forceRequire
      : undefined  // Default to `undefined`, which is automatically desired by function
  };

  // Enable `forceRequire` when importing a JSON configuration file
  // to prevent undesired exception due to importing a JSON using `import()`
  // which need to use `with { type: 'json' }` expression.
  // * NOTE: This can be overridden by `parserOptons.forceRequire`
  let forceRequire = path.extname(globConfigPath) === '.json';
  if (typeof parserOptions.forceRequire !== 'undefined') ({ forceRequire } = parserOptions);

  // Check if the configuration file is readable
  try {
    await fs.promises.access(globConfigPath, fs.constants.R_OK);
  } catch (accessErr) {
    throw new GlobalConfigParserError(
      'Unable to access the global configuration file', { cause: accessErr });
  }

  // Import the configuration file
  return await parseConfig(globConfigPath, true, forceRequire);
}


module.exports = {
  KNOWN_OPTIONS,
  KNOWN_CONFIG_EXTS,
  ERR_FORMAT,
  configChecker,
  resolveConfig,
  parseConfig,
  importConfig,
  findGlobalConfig,
  parseGlobalConfig
};
