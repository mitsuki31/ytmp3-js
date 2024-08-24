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
 * file will be validated first and will throws a `TypeError` if any known
 * configuration options has an invalid type, or throws a
 * {@link module:config~UnknownOptionError `UnknownOptionError`} if there
 * is an unknown option defined within the configuration object (see the
 * {@link module:config~KNOWN_OPTIONS `KNOWN_OPTIONS`}).
 *
 * @example <caption> JSON Configuration File </caption>
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
 * @example <caption> CommonJS Module Configuration File </caption>
 * module.exports = {
 *   downloadOptions: {
 *     outDir: '..',
 *     convertAudio: false,
 *     quiet: true
 *   }
 * }
 *
 * @example <caption> ES Module Configuration File </caption>
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
 * @author    Ryuu Mitsuki (https://github.com/mitsuki31)
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

const path = require('node:path');
const util = require('node:util');
const ytmp3 = require('./ytmp3');
const {
  isNullOrUndefined,
  isObject,
} = require('./utils');
const {
  resolveOptions: resolveACOptions
} = require('./audioconv');
const { UnknownOptionError } = require('./error');

/**
 * An array containing all known configuration file's extension names.
 *
 * @type {Readonly<Array<('.js' | '.mjs' | '.cjs' | '.json')>>}
 * @readonly
 * @default
 * @package
 * @since  1.0.0
 */
const KNOWN_CONFIG_EXTS = [ '.js', '.mjs', '.cjs', '.json' ];
/**
 * An array containing all known configuration options.
 *
 * @type {Readonly<Array<('downloadOptions' | 'audioConverterOptions')>>}
 * @readonly
 * @default
 * @package
 * @since  1.0.0
 */
const KNOWN_OPTIONS = [ 'downloadOptions', 'audioConverterOptions' ];
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
 * @throws {TypeError} If any known options is not object type.
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
 * @throws {TypeError} If any known options is not object type.
 * @throws {UnknownOptionError} If there are unknown fields in the configuration.
 *
 * @package
 * @since   1.0.0
 */
function configChecker({ config, file }) {
  if (!config || typeof config !== 'object') {
    throw new TypeError('Invalid type of configuration: ' + typeof config);
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
      throw new TypeError(util.format(ERR_FORMAT,
        `Expected type of field '${field}' is an object`,
        dirFile, baseFile
      ));
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
 * @throws {TypeError} - If the given `configFile` is not a string.
 * @throws {Error} - If the file extension is not supported or if an error occurs during import.
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
function parseConfig(configFile, resolve=true) {
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
    throw new TypeError('Expected a string path refers to a configuration file');
  }

  const file = path.resolve(configFile);  // Copy and resolve path
  const ext = path.extname(configFile);   // Extract the extension name

  if (!(KNOWN_CONFIG_EXTS.includes(ext))) {
    throw new Error(`Supported configuration file is: ${
      KNOWN_CONFIG_EXTS.map(x => `'${x}'`).toString().replace(/,/g, ' | ')
    }`);
  }

  // Resolve the configuration file path
  configFile = path.resolve(configFile);

  // Import the configuration file
  let config = null;
  // Only include '.cjs' and '.json' to use require()
  if (KNOWN_CONFIG_EXTS.slice(2).includes(path.extname(configFile))) {
    config = require(configFile);
  } else {
    config = import(configFile);
  }

  if (config instanceof Promise) {
    // Return a Promise if the imported config module is a ES Module
    return new Promise(function (res, rej) {
      config.then((result) => res(resolveOrCheckOnly(result))).catch((err) => rej(err));
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
const importConfig = (file) => parseConfig(file, true);


module.exports = Object.freeze({
  configChecker,
  resolveConfig,
  parseConfig,
  importConfig
});
