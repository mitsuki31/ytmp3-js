/**
 * @file This module provides functions to validate and resolve user input options.
 *
 * This module also provide the default options used by the application, they are defined in
 * the `defaults` namespace. Please note, all properties within the namespace are read-only properties.
 *
 * @module   utils/options
 * @requires utils/type-utils
 * @author   Ryuu Mitsuki <dhefam31@gmail.com>
 * @license  MIT
 * @since    2.0.0
 */

'use strict';

const { Readable } = require('stream');
const TypeUtils = require('./type-utils');
const { InvalidTypeError } = require('../error');


/**
 * A namespace containing all default options used by the application.
 *
 * @namespace  module:utils/options~defaults
 * @public
 * @since      2.0.0
 */
const defaults = {
  /**
   * Default options for {@link module:ytmp3~getInfo `getInfo`} function.
   *
   * @memberof module:utils/options~defaults
   * @property {boolean} useCache=true
   * @property {boolean} asObject=false
   * @property {boolean} verbose=false
   */
  GetInfoOptions: Object.freeze({
    useCache: true,
    asObject: false,
    verbose: false
  }),
  /**
   * Default options for {@link module:ytmp3~download `download`} function.
   *
   * @memberof module:utils/options~defaults
   * @property {string} cwd="."
   * @property {string} outDir="."
   * @property {boolean} convertAudio=false
   * @property {object} converterOptions={}
   * @property {boolean} quiet=false
   * @property {Function} handler
   * @property {boolean} useCache=false
   */
  DownloadOptions: Object.freeze({
    cwd: '.',
    outDir: '.',
    outFile: undefined,
    convertAudio: false,
    converterOptions: {},
    quiet: false,
    handler: () => {},  // Will be override later
    format: undefined,
    useCache: true
  }),
  AudioConverterOptions: Object.freeze({
    inputOptions: [],
    outputOptions: [],
    format: 'mp3',
    codec: 'libmp3lame',
    bitrate: 128,
    frequency: 44100,
    channels: 2,
    deleteOld: false,
    quiet: false
  })
};

const _YTDLChooseFormatOptions = {
  quality: ['string'],
  filter: [['string', 'function']],
  format: ['object']
};

const _YTDLGetInfoOptions = {
  lang: ['string'],
  requestCallback: ['function'],
  rewriteRequest: ['function'],
  fetch: ['function'],
  requestOptions: ['object'],
  agent: ['object'],
  playerClients: ['array']
};

const _YTDLDownloadOptions = {
  ..._YTDLChooseFormatOptions,
  ..._YTDLGetInfoOptions,
  range: ['object'],
  begin: [['string', 'number', Date]],
  liveBuffer: ['number'],
  highWaterMark: ['number'],
  IPv6Block: ['string'],
  dlChunkSize: ['number'],
};

const _FFmpegCommandOptions = {
  logger: [['object', 'function'], undefined],
  niceness: ['number', undefined],
  priority: ['number', undefined],
  presets: ['string', undefined],
  preset: ['string', undefined],
  stdoutLines: ['number', undefined],
  timeout: ['number', undefined],
  source: [['string', Readable], undefined],
  cwd: ['string', undefined],
};

const _GetInfoOptions = {
  ..._YTDLGetInfoOptions,
  useCache: ['boolean', defaults.GetInfoOptions.useCache],
  asObject: ['boolean', defaults.GetInfoOptions.asObject],
  verbose: ['boolean', defaults.GetInfoOptions.verbose]
};

const _DownloadOptions = {
  ..._YTDLDownloadOptions,
  ...(Object.entries(_GetInfoOptions)
    .reduce((acc, val) => {
      // Exclude the `asObject` option
      if (val[0] !== 'asObject') acc[val[0]] = val[1];
      return acc;
    }, {})
  ),
  cwd: ['string', defaults.DownloadOptions.cwd],
  outDir: ['string', defaults.DownloadOptions.outDir],
  outFile: ['string', defaults.DownloadOptions.outFile],
  convertAudio: ['boolean', defaults.DownloadOptions.convertAudio],
  converterOptions: ['object', defaults.DownloadOptions.converterOptions],
  quiet: [['boolean', 'string'], defaults.DownloadOptions.quiet],
  handler: ['function'],
  format: ['object', defaults.DownloadOptions.format],
  useCache: ['boolean', defaults.DownloadOptions.useCache]
};

const _AudioConverterOptions = {
  inputOptions: [['array', 'string'], defaults.AudioConverterOptions.inputOptions],
  outputOptions: [['array', 'string'], defaults.AudioConverterOptions.outputOptions],
  format: ['string', defaults.AudioConverterOptions.format],
  codec: ['string', defaults.AudioConverterOptions.codec],
  bitrate: [['number', 'string'], defaults.AudioConverterOptions.bitrate],
  frequency: ['number', defaults.AudioConverterOptions.frequency],
  channels: ['number', defaults.AudioConverterOptions.channels],
  deleteOld: ['boolean', defaults.AudioConverterOptions.deleteOld],
  quiet: ['boolean', defaults.AudioConverterOptions.quiet]
};


/**
 * Resolves and validates input options against expected types and default values.
 *
 * This function ensures that only recognized options with the correct types are retained.
 * If an option is missing or has an incorrect type, it is replaced with a default value (if specified).
 *
 * ### How It Works
 * - **Filters Out Unknown Options**: Only options defined in `expectedOpts` are included.
 * - **Validates Option Types**: Each option's type is checked against the expected type.
 * - **Supports Multiple Expected Types**: 
 *   - If an option accepts multiple types (e.g., `'string'` or `'number'`), 
 *     the function iterates through them and assigns the first valid type.
 * - **Handles Special Cases**:
 *   - `'array'` is explicitly checked using `Array.isArray()`.
 *   - `'function'` ensures that the value is callable but **not an ES6 class**.
 *   - If an **expected type is a class**, it checks if the value is an instance of that class.
 * - **Fallback to Default Values**: If an option is missing or invalid, the default value is used.
 *
 * @param {Record<string, any>} inOpts - The input options to be resolved.
 * @param {Record<string, Array<string | Function | Array<string | Function | any> | any>>} expectedOpts -
 *        An object defining expected types and default values. With the key being the option name and the value being
 *        an array defining the expected type(s) and default value.
 *
 * @returns {Record<string, any>} An object containing only the valid and resolved options.
 *
 * @example <caption> Basic usage with primitive types </caption>
 * const options = resolveOptions(
 *   { cacheSize: '10', verbose: true },
 *   { cacheSize: ['number', 5], verbose: ['boolean', false] }
 * );
 * console.log(options);  // { cacheSize: 5, verbose: true }
 *
 * @example <caption> Handling multiple expected types </caption>
 * const options = resolveOptions(
 *   { cacheSize: '10', mode: 'fast' },
 *   { cacheSize: [['number', 'string'], 5], mode: ['string', 'default'] }
 * );
 * console.log(options);  // { cacheSize: '10', mode: 'fast' }
 *
 * @example <caption> Handling class instances </caption>
 * class CacheHandler {}
 * const options = resolveOptions(
 *   { handler: new CacheHandler() },
 *   { handler: [CacheHandler, null] }
 * );
 * console.log(options);  // { handler: CacheHandler {} }
 *
 * @example <caption> Handling invalid values </caption>
 * const options = resolveOptions(
 *   { cacheSize: 'not a number' },
 *   { cacheSize: ['number', 10] }
 * );
 * console.log(options); // { cacheSize: 10 } // Falls back to default
 *
 * @package
 * @since 2.0.0
 */
function resolve(inOpts, expectedOpts, shouldThrow=false) {
  function _throw(name, actual, expected) {
    if (!shouldThrow) return;  // Reject to throw if the `shouldThrow` is false
    const expectedType = typeof expected === 'string' ? expected
      : (Array.isArray(expected) ? expected.map(TypeUtils.getType).join(' | ')
        : TypeUtils.getType(expected));
    throw new InvalidTypeError(`Property with name '${name}' is invalid type`, {
      actualType: TypeUtils.getType(actual),
      expectedType
    });
  }

  const resolvedOptions = {};

  // Iterate over expected options to filter and validate the input options
  for (const [key, expectedTypeArray] of Object.entries(expectedOpts)) {
    const [expectedType, defaultValue] = expectedTypeArray;
    let isValid = false;

    if (key in inOpts) {
      const value = inOpts[key];

      // Handle string type checks
      if (typeof expectedType === 'string') {
        switch (expectedType) {
          case 'array':
            isValid = Array.isArray(value);
            break;
          case 'function':  // Any function but not a ES6 class
            isValid = !TypeUtils.isClass(value);
            break;
          default:
            isValid = typeof value === expectedType;
        }
      }
      // Handle class instance checks
      else if (TypeUtils.isCallable(expectedType)) {
        isValid = value instanceof expectedType;
      }
      // Handle multiple type checks
      else if (Array.isArray(expectedType)) {
        let value;

        for (const type of expectedType) {
          value = Object.values(resolve(
            { [key]: inOpts[key] },
            { [key]: [type] }
          ))[0];
          if (typeof value !== 'undefined') break;  // Break loop after found the first expected value
        }
        isValid = typeof value !== 'undefined';
      }
      resolvedOptions[key] = isValid ? value : defaultValue;  // Assign the value
      isValid || _throw(key, value, expectedType);  // Optionally throw if any invalid type
    } else {
      // No error being thrown here
      resolvedOptions[key] = defaultValue;
    }
  }

  return resolvedOptions;
}


module.exports = {
  _YTDLChooseFormatOptions,
  _YTDLGetInfoOptions,
  _YTDLDownloadOptions,
  _FFmpegCommandOptions,
  _GetInfoOptions,
  _DownloadOptions,
  _AudioConverterOptions,
  defaults,
  resolve,
  resolveOptions: resolve  // Alias
};
