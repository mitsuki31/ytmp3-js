/**
 * @file Argument parser for YTMP3 command-line options.
 *
 * @module    bin/argparser
 * @requires  audioconv
 * @requires  config
 * @requires  utils
 * @requires  ytmp3
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @since     1.1.0
 * @license   MIT
 */

'use strict';

/**
 * A type definition for the filtered options object, which is returned from {@link filterOptions} function.
 *
 * @typedef  {Object} FilteredOptions
 * @property {string} urls - A list of URLs to be processed.
 * @property {string} batchFile - The path to the batch file containing YouTube URLs.
 * @property {number} version - A number counter to show the version. 1 shows this module version only, 2 shows all dependencies' version.
 * @property {boolean} copyright - A boolean flag to show the copyright information.
 * @property {boolean} printConfig - A boolean flag to show the currently used configuration and exit. Useful for debugging.
 * @property {DownloadOptions} downloadOptions - The options related to the download process.
 *
 * @package
 * @since   1.0.0
 */

const {
  SUPPRESS,
  ZERO_OR_MORE,
  ArgumentParser,
  BooleanOptionalAction,
  RawDescriptionHelpFormatter
} = require('argparse');

const { resolveOptions: resolveACOptions } = require('../lib/audioconv');
const {
  dropNullAndUndefined,
  isPlainObject,
  isNullOrUndefined
} = require('../lib/utils');
const {
  importConfig,
  findGlobalConfig,
  parseGlobalConfig
} = require('../lib/config');
const { resolveDlOptions } = require('../lib/ytmp3');
const pkg = require('../package.json');


// Windows: "C:\Users\...\AppData\Local\Temp\ytmp3-js"
// Linux: "/home/usr/tmp/ytmp3-js"
// Termux Android: "/data/data/com.termux/files/usr/tmp/ytmp3-js"
const author = {
  name: pkg.author.split(' <')[0],
  email: /<(\w+@[a-z0-9.]+)>/m.exec(pkg.author)[1],
  website: /\((https?:\/\/.+)\)/m.exec(pkg.author)[1]
};

const __version__ = (() => {
  // eslint-disable-next-line prefer-const
  let [ ver, rel ] = (pkg.version || '0.0.0-dev').split('-');
  rel = (rel && rel.length !== 0)
    ? rel.charAt(0).toUpperCase() + rel.substring(1)  // Capitalize first letter
    : 'Stable';
  return `\x1b[1m[${pkg.name.toUpperCase()}] v${ver} \x1b[2m${rel}\x1b[0m\n`;
})();

const __copyright__ = `${pkg.name} - Copyright (c) 2023-${
  new Date().getFullYear()} ${author.name} (${author.website})\n`;


/**
 * Initializes the argument parser for command-line options.
 *
 * @returns {argparse.ArgumentParser} The `ArgumentParser` instance.
 *
 * @package
 * @since   1.0.0
 */
function initParser() {
  const parser = new ArgumentParser({
    prog: pkg.title
      ? pkg.title.toLowerCase()
      : (pkg.name ? pkg.name.replace('-js', '') : 'ytmp3'),
    description: pkg.description,
    // eslint-disable-next-line camelcase
    formatter_class: RawDescriptionHelpFormatter,
    epilog: `
      Developed by \x1b[93m${author.name}\x1b[0m (${author.website}).
      
      \x1b[1;91m::\x1b[0m \x1b[1;96m[Homepage]\x1b[0m\thttps://mitsuki31.github.io/ytmp3-js
      \x1b[1;91m::\x1b[0m \x1b[1;95m[GitHub]\x1b[0m\thttps://github.com/mitsuki31/ytmp3-js
    `.trim().replace(/[ ]{2,}/g, ''),
    // eslint-disable-next-line camelcase
    add_help: false  // Use custom help argument
  });

  // ==== Download Options ==== //
  // :: URL
  parser.add_argument('URL', {
    help: 'The YouTube URL(s) to download. Supports multiple URLs',
    type: 'str',
    nargs: ZERO_OR_MORE,  // Support multiple URLs
    default: SUPPRESS
  });
  // :: cwd
  parser.add_argument('--cwd', {
    metavar: 'DIR',
    help: 'Set the current working directory (default: current directory)',
    type: 'str',
    default: SUPPRESS
  });
  // :: FILE
  parser.add_argument('-f', '--file', '--batch', {
    help: 'Path to a file containing a list of YouTube URLs for batch downloading',
    type: 'str',
    dest: 'file',
    default: SUPPRESS
  });
  // :: outDir
  parser.add_argument('-o', '--outDir', '--out-dir', {
    metavar: 'DIR',
    help: 'Specify the output directory for downloaded files (default: current directory)',
    type: 'str',
    dest: 'outDir',
    default: SUPPRESS
  });
  // :: config
  parser.add_argument('-c', '--config', {
    metavar: 'FILE',
    help: 'Path to configuration file containing `downloadOptions` object',
    type: 'str',
    dest: 'config',
    default: SUPPRESS
  });
  // :: noConfig
  parser.add_argument('--noConfig', '--no-config', {
    help: 'Disable the automatic loading and merging of global or specified configuration files',
    action: 'store_true'
  });
  // :: convertAudio
  parser.add_argument('-C', '--convertAudio', '--convert-audio', {
    help: 'Enable audio conversion to a specific format (requires FFmpeg)',
    action: BooleanOptionalAction,
    dest: 'convertAudio'
  });

  // ==== Audio Converter Options ==== //
  // :: inputOptions
  parser.add_argument(
    '--inputOptions',
    '--input-options',
    '--addInputOptions',
    '--add-input-options',
    '--inOpt',
    {
      metavar: 'OPT',
      help: 'Add custom input options for audio conversion',
      type: 'str',
      dest: 'inputOptions',
      default: SUPPRESS
    }
  );
  // :: outputOptions
  parser.add_argument(
    '--outputOptions',
    '--output-options',
    '--addOption',
    '--add-option',
    '--addOutputOptions',
    '--add-output-options',
    '--outOpt',
    {
      metavar: 'OPT',
      help: 'Add custom output options for audio conversion',
      type: 'str',
      dest: 'outputOptions',
      default: SUPPRESS
    }
  );
  // :: format
  parser.add_argument('--format', {
    metavar: 'FMT',
    help: 'Convert the audio to the specified format. Requires `--convertAudio`',
    type: 'str',
    default: SUPPRESS
  });
  // :: codec
  parser.add_argument('--codec', '--encoding', {
    metavar: 'CODEC',
    help: 'Specify the codec for the converted audio. Requires `--convertAudio`',
    dest: 'codec',
    default: SUPPRESS
  });
  // :: bitrate
  parser.add_argument('--bitrate', {
    metavar: 'N',
    help: 'Set the bitrate for the converted audio in kbps. Requires `--convertAudio`',
    type: 'str',
    default: SUPPRESS
  });
  // :: frequency
  parser.add_argument('--freq', '--frequency', {
    metavar: 'N',
    help: 'Set the audio sampling frequency for the converted audio in Hertz. Requires `--convertAudio`',
    type: 'int',
    dest: 'frequency',
    default: SUPPRESS
  });
  // :: channels
  parser.add_argument('--channels', {
    metavar: 'N',
    help: 'Specify the audio channels for the converted audio. Requires `--convertAudio`',
    type: 'int',
    default: SUPPRESS
  });
  // :: deleteOld
  parser.add_argument('--deleteOld', '--delete-old', '--overwrite', {
    help: 'Delete the old file after audio conversion is done. Requires `--convertAudio`',
    action: BooleanOptionalAction,
    dest: 'deleteOld'
  });
  // :: quiet
  parser.add_argument('-q', '--quiet', {
    help: 'Suppress output messages. Use `-qq` to also suppress audio conversion progress',
    action: 'count',
    default: 0  // Set the default to ensure it is always number
  });
  // :: noQuiet
  parser.add_argument('--noQuiet', '--no-quiet', {
    help: 'Enable suppressed output messages (only affect if `quiet` is enabled)',
    action: 'store_true',
    dest: 'noQuiet'
  });

  // ==== Other Options ==== //
  // :: help
  parser.add_argument('-h', '-?', '--help', {
    help: 'Show this help message and exit',
    action: 'help'
  });
  // :: version
  parser.add_argument('-V', '--version', {
    help: 'Show the version. Use `-VV` to show all dependencies version',
    action: 'count',
    default: 0
  });
  // :: copyright
  parser.add_argument('--copyright', {
    help: 'Show the copyright information',
    action: 'store_true'
  });
  parser.add_argument('--print-config', {
    help: 'Show currently used configuration and exit. Useful for debugging',
    action: 'store_true',
    dest: 'printConfig'
  });

  return parser;
}

/**
 * Filters and processes the provided options object for use in the download and conversion process.
 *
 * @param {Object} params - The parameters object.
 * @param {Object} params.options - The options object containing various configuration
 *                                  settings from command-line argument parser.
 *
 * @returns {FilteredOptions} A frozen object with the filtered and processed options.
 *
 * @description
 * This function performs the following steps:
 * 1. Validates the `options` object to ensure it is not null, an array, or a non-object.
 * 2. Creates a deep copy of the `options` object to avoid mutating the original input.
 * 3. Extracts the `quiet` property from the copied options and deletes it from the object to
 *    prevent conflicts with other functions.
 * 4. Constructs a new object containing the processed options for download and conversion,
 *    including:
 *    - `url`: The URL(s) to be processed.
 *    - `batchFile`: The path to the batch file containing YouTube URLs.
 *    - `version`: The version information.
 *    - `copyright`: The copyright information.
 *    - `downloadOptions`: The options related to the download process, resolved using
 *      {@link module:ytmp3~resolveDlOptions `ytmp3.resolveDlOptions`} and
 *      {@link module:audioconv~resolveOptions `audioconv.resolveOptions`} (for the
 *      audio conversion options).
 *      - `converterOptions`: The options related to audio conversion.
 *      - `quiet`: A boolean flag to suppress log messages and progress information
 *        based on the value of `quiet`.
 *
 * The returned object is frozen to prevent further modifications.
 *
 * @package
 * @since   1.0.0
 */
async function filterOptions({ options }) {
  if (!options || !isPlainObject(options)) return {};

  // Deep copy the options and remove unspecified options,
  // especially for 'cwd' and 'outDir'
  let optionsCopy = dropNullAndUndefined(
    JSON.parse(JSON.stringify(options)));

  const { noConfig, noQuiet } = optionsCopy;
  let { quiet } = optionsCopy;
  // We need to extract the quiet option first and delete it
  // if not, `audioconv.resolveOptions()` function will throw an error
  delete optionsCopy.quiet;
  delete optionsCopy.noConfig;  // No longer used
  delete optionsCopy.noQuiet;  // No longer used

  // Reset the quiet level to zero if the `--no-quiet` is specified
  if (noQuiet) quiet = 0;

  // Look up for global configuration file and parse if available
  const globalConfigFile = await findGlobalConfig();  // ! Can be null
  // Only parse the global configuration file if `--no-config` option is disabled
  const globalConfig = (globalConfigFile && !noConfig)
    ? await parseGlobalConfig(globalConfigFile)
    : null;
  const dlOptionsFromGlobalConfig = { ...(globalConfig || {}) };
  const acOptionsFromGlobalConfig = globalConfig?.converterOptions || {};
  if (dlOptionsFromGlobalConfig.converterOptions) {
    delete dlOptionsFromGlobalConfig.converterOptions;
  }

  // Override options and resolve unspecified options
  // if global config is available
  if (!isNullOrUndefined(globalConfig) && !noConfig) {
    optionsCopy = {
      ...optionsCopy,
      cwd: isNullOrUndefined(optionsCopy.cwd)
        ? globalConfig.cwd : optionsCopy.cwd,
      outDir: isNullOrUndefined(optionsCopy.outDir)
        ? globalConfig.outDir : optionsCopy.outDir,
      convertAudio: isNullOrUndefined(optionsCopy.convertAudio)
        ? globalConfig.convertAudio : optionsCopy.convertAudio,
      quiet: optionsCopy.quiet === 0
        ? globalConfig.quiet : optionsCopy.quiet,
    };
  }

  optionsCopy.convertAudio = isNullOrUndefined(optionsCopy.convertAudio)
    ? false : optionsCopy.convertAudio;
  // Set to an empty array for clarity that the options is empty and unspecified
  optionsCopy.inputOptions = isNullOrUndefined(optionsCopy.inputOptions)
    ? [] : optionsCopy.inputOptions;
  optionsCopy.outputOptions = isNullOrUndefined(optionsCopy.outputOptions)
    ? [] : optionsCopy.outputOptions;

  // Extract and resolve the download options from configuration file if given
  // and only if the `--no-config` option is disabled
  let dlOptionsFromConfig = optionsCopy.config && !noConfig
    ? importConfig(optionsCopy.config)
    : {};
  // Await the download options if it is a promise
  if (dlOptionsFromConfig instanceof Promise) {
    dlOptionsFromConfig = await dlOptionsFromConfig;
  }
  const acOptionsFromConfig = dlOptionsFromConfig.converterOptions || {};
  delete optionsCopy.config;  // No longer needed
  delete dlOptionsFromConfig.converterOptions;  // No longer needed

  return Object.freeze({
    urls: optionsCopy.URL,
    batchFile: optionsCopy.file,
    version: optionsCopy.version,
    copyright: optionsCopy.copyright,
    printConfig: optionsCopy.printConfig,
    downloadOptions: {
      ...resolveDlOptions({ downloadOptions: {
        ...dlOptionsFromGlobalConfig,  // Download options from global config
        // Download options from config file can be overriden with download
        // options from the command-line
        ...dlOptionsFromConfig || {},
        ...(resolveDlOptions({ downloadOptions: optionsCopy }))
      }}),
      converterOptions: {
        ...resolveACOptions({
          ...acOptionsFromGlobalConfig,  // Audio conversion options from global config
          ...dropNullAndUndefined(acOptionsFromConfig),
          ...dropNullAndUndefined(optionsCopy)
        }, false), 
        quiet: quiet >= 2
      },
      quiet: quiet >= 1
    }
  });
}


module.exports = {
  author,
  __version__,
  __copyright__,
  initParser,
  filterOptions
};