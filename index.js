#!/usr/bin/env node

/**
 * @file Main module for **YTMP3** project to download YouTube videos as audio files using CLI.
 *
 * @requires  lib/audioconv
 * @requires  lib/utils
 * @requires  lib/ytmp3
 * @author    Ryuu Mitsuki (https://github.com/mitsuki31)
 * @license   MIT
 * @since     0.1.0
 */

/**
 * A type definition for the filtered options object, which is returned from {@link filterOptions} function.
 *
 * @typedef  {Object} FilteredOptions
 * @property {string} url - The URL(s) to be processed.
 * @property {string} batchFile - The path to the batch file containing YouTube URLs.
 * @property {number} version - A number counter to show the version. 1 shows this module version only, 2 shows all dependencies' version.
 * @property {boolean} copyright - A boolean flag to show the copyright information.
 * @property {boolean} printConfig - A boolean flag to show the currently used configuration and exit. Useful for debugging.
 * @property {DownloadOptions} downloadOptions - The options related to the download process.
 *
 * @private
 * @since   1.0.0
 */

'use strict';

const fs = require('fs');      // File system module
const path = require('path');  // Path module
const { EOL } = require('os');
const { promisify } = require('util');
const { ArgumentParser } = require('argparse');
const {
  getTempPath,
  createTempPath: _createTempPath
} = require('@mitsuki31/temppath');
const createTempPath = promisify(_createTempPath);

const {
  defaultOptions: defaultAudioConvOptions,
  resolveOptions: resolveACOptions,
  checkFfmpeg,
  convertAudio,
} = require('./lib/audioconv');
const { logger: log, dropNullAndUndefined } = require('./lib/utils');
const { importConfig } = require('./lib/config');
const ytmp3 = require('./lib/ytmp3');
const pkg = require('./package.json');

const DEFAULT_BATCH_FILE = path.join(__dirname, 'downloads.txt');
// Windows: "C:\Users\...\AppData\Local\Temp\ytmp3-js"
// Linux: "/home/usr/tmp/ytmp3-js"
// Termux Android: "/data/data/com.termux/files/usr/tmp/ytmp3-js"
const TEMPDIR = path.join(path.dirname(getTempPath()), 'ytmp3-js');
const author = {
  name: pkg.author.split(' <')[0],
  email: /<(\w+@[a-z0-9.]+)>/m.exec(pkg.author)[1],
  website: /\((https?:\/\/.+)\)/m.exec(pkg.author)[1]
};

const __version__ = (() => {
  // eslint-disable-next-line prefer-const
  let [ ver, rel ] = (pkg.version || '0.0.0-dev').split('-');
  rel = (rel && rel.length !== 0)
    ? rel.charAt(0).toUpperCase() + rel.substr(1)  // Capitalize first letter
    : 'Stable';
  return `\x1b[1m[${pkg.name.toUpperCase()}] v${ver} \x1b[2m${rel}\x1b[0m\n`;
})();

const __copyright__ = `${pkg.name} - Copyright (c) 2023-${
  new Date().getFullYear()} ${author.name} (${author.website})\n`;

/** Store the file path of cached multiple download URLs. */
let multipleDlCache = null;

/**
 * Initializes the argument parser for command-line options.
 *
 * @returns {argparse.ArgumentParser} The `ArgumentParser` instance.
 *
 * @private
 * @since   1.0.0
 */
function initParser() {
  const parser = new ArgumentParser({
    prog: pkg.title
      ? pkg.title.toLowerCase()
      : (pkg.name ? pkg.name.replace('-js', '') : 'ytmp3'),
    description: pkg.description,
    epilog: `Developed by \x1b[93m${author.name}\x1b[0m (${author.website}).`,
    // eslint-disable-next-line camelcase
    add_help: false  // Use custom help argument
  });

  // ==== Download Options ==== //
  // :: URL
  parser.add_argument('URL', {
    help: 'The YouTube URL(s) to download. Supports multiple URLs',
    type: 'str',
    nargs: '*'  // Support multiple URLs
  });
  // :: cwd
  parser.add_argument('--cwd', {
    metavar: 'DIR',
    help: 'Set the current working directory (default: current directory)',
    type: 'str',
    default: '.'
  });
  // :: FILE
  parser.add_argument('-f', '--file', '--batch', {
    help: 'Path to a file containing a list of YouTube URLs for batch downloading',
    type: 'str',
    dest: 'file'
  });
  // :: outDir
  parser.add_argument('-o', '--outDir', '--out-dir', {
    metavar: 'DIR',
    help: 'Specify the output directory for downloaded files (default: current directory)',
    type: 'str',
    default: '.',
    dest: 'outDir'
  });
  // :: config
  parser.add_argument('-c', '--config', {
    metavar: 'FILE',
    help: 'Path to configuration file containing `downloadOptions` object',
    type: 'str',
    dest: 'config'
  });
  // :: convertAudio
  parser.add_argument('-C', '--convertAudio', '--convert-audio', {
    help: 'Enable audio conversion to a specific format (requires FFmpeg)',
    action: 'store_true',
    dest: 'convertAudio'
  });

  // ==== Audio Converter Options ==== //
  // :: format
  parser.add_argument('--format', {
    metavar: 'FMT',
    help: 'Convert the audio to the specified format. Requires `--convertAudio`',
    type: 'str',
  });
  // :: codec
  parser.add_argument('--codec', '--encoding', {
    metavar: 'CODEC',
    help: 'Specify the codec for the converted audio. Requires `--convertAudio`',
    dest: 'codec'
  });
  // :: bitrate
  parser.add_argument('--bitrate', {
    metavar: 'N',
    help: 'Set the bitrate for the converted audio in kbps. Requires `--convertAudio`',
    type: 'str'
  });
  // :: frequency
  parser.add_argument('--freq', '--frequency', {
    metavar: 'N',
    help: 'Set the audio sampling frequency for the converted audio in Hertz. Requires `--convertAudio`',
    type: 'int',
    dest: 'frequency'
  });
  // :: channels
  parser.add_argument('--channels', {
    metavar: 'N',
    help: 'Specify the audio channels for the converted audio. Requires `--convertAudio`',
    type: 'int'
  });
  // :: deleteOld
  parser.add_argument('--deleteOld', '--delete-old', '--overwrite', {
    help: 'Delete the old file after audio conversion is done. Requires `--convertAudio`',
    action: 'store_true',
    dest: 'deleteOld'
  });
  // :: quiet
  parser.add_argument('-q', '--quiet', {
    help: 'Suppress output messages. Use `-qq` to also suppress audio conversion progress',
    action: 'count',
    default: 0  // Set the default to ensure it is always number
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
 * @private
 * @since   1.0.0
 */
async function filterOptions({ options }) {
  if (!options || (Array.isArray(options) || typeof options !== 'object')) return {};

  // Deep copy the options
  const optionsCopy = JSON.parse(JSON.stringify(options));

  // We need to extract the quiet option first and delete it
  // if not, `audioconv.resolveOptions()` function will throw an error
  const { quiet } = optionsCopy;
  delete optionsCopy.quiet;

  // Extract and resolve the download options from configuration file if given
  const dlOptionsFromConfig = optionsCopy.config
    ? await /* may an ES module */ importConfig(optionsCopy.config)
    : {};
  const acOptionsFromConfig = dlOptionsFromConfig.converterOptions || {};
  delete optionsCopy.config;  // No longer needed
  delete dlOptionsFromConfig.converterOptions;  // No longer needed

  return Object.freeze({
    url: optionsCopy.URL,
    batchFile: optionsCopy.file,
    version: optionsCopy.version,
    copyright: optionsCopy.copyright,
    printConfig: optionsCopy.printConfig,
    downloadOptions: {
      ...ytmp3.resolveDlOptions({ downloadOptions: {
        // Download options from config file can be overriden with download
        // options from the command-line
        ...dlOptionsFromConfig || {},
        ...(ytmp3.resolveDlOptions({ downloadOptions: optionsCopy }))
      }}),
      converterOptions: {
        ...resolveACOptions({
          ...dropNullAndUndefined(acOptionsFromConfig),
          ...dropNullAndUndefined(optionsCopy)
        }, false), 
        quiet: quiet >= 2
      },
      quiet: quiet >= 1
    }
  });
}

/**
 * Creates a cache file for URLs to be downloaded.
 *
 * This function creates a temporary file in the system's temporary directory
 * containing a list of URLs to be downloaded using the
 * {@link module:ytmp3~batchDownload `ytmp3.batchDownload`} function.
 *
 * @param {string[]} urls - URLs to be written to cache file
 * @returns {Promise<string>} The path to the cache file for later deletion
 */
async function createCache(urls) {
  const cache = await createTempPath(TEMPDIR, {
    asFile: true,
    ext: 'dl',
    maxLen: 20
  });
  // Create write stream for cache file
  const cacheStream = fs.createWriteStream(cache);

  // Write URLs to cache
  urls.forEach(url => cacheStream.write(`${url}${EOL}`));

  // Close the write stream
  cacheStream.end();
  return cache;
}

/**
 * Deletes the cache file if it exists
 *
 * @returns {Promise<boolean>} `true` if the cache file is deleted successfully
 */
async function deleteCache() {
  if (!multipleDlCache) return false;
  if (fs.existsSync(multipleDlCache)) {
    // Delete the parent directory of the cache file
    await fs.promises.rm(path.dirname(multipleDlCache), { recursive: true, force: true });
  }
  return true;
}


/**
 * Main function.
 * @private
 * @since   1.0.0
 */
async function main() {
  const {
    url,
    batchFile,
    version,
    copyright,
    downloadOptions,
    printConfig
  } = await filterOptions({
    options: initParser().parse_args()
  });

  // Version
  if (version === 1) {
    process.stdout.write(__version__);
    return;
  } else if (version >= 2) {
    // If got '-VV' or '--version --version', then verbosely print this module
    // version and all dependencies' version
    const deps = Object.keys(pkg.dependencies);
    process.stdout.write(__version__);
    for (const dep of deps) {
      process.stdout.write(`\x1b[1m  ${
        ((deps.indexOf(dep) !== deps.length - 1) ? '├── ' : '└── ')
      }${dep} :: v${require(dep + '/package.json').version}\x1b[0m\n`);
    }
    return;
  }
  // Copyright
  if (copyright) {
    process.stdout.write(__copyright__);
    return;
  }
  // Print configuration
  if (printConfig) {
    console.log(downloadOptions);
    return;
  }

  let downloadSucceed = false;
  try {
    if ((!url || (url && !url.length)) && !batchFile) {
      const defaultBatchFileBase = path.basename(DEFAULT_BATCH_FILE);
      log.info(`\x1b[2mNo URL and batch file specified, searching \x1b[93m${
        defaultBatchFileBase}\x1b[0m\x1b[2m ...\x1b[0m`);
      if (!fs.existsSync(DEFAULT_BATCH_FILE)) {
        log.error(`Cannot find \x1b[93m${
          defaultBatchFileBase}\x1b[0m at current directory`);
        log.error('Aborted');
        process.exit(1);
      }
      log.info('\x1b[95mMode: \x1b[97mBatch Download\x1b[0m');
      downloadSucceed = !!await ytmp3.batchDownload(DEFAULT_BATCH_FILE, downloadOptions);
    } else if ((!url || (url && !url.length)) && batchFile) {
      log.info('\x1b[95mMode: \x1b[97mBatch Download\x1b[0m');
      downloadSucceed = !!await ytmp3.batchDownload(batchFile, downloadOptions);
    } else if (url.length && !batchFile) {
      if (Array.isArray(url) && url.length > 1) {
        log.info('\x1b[95mMode: \x1b[97mMultiple Downloads\x1b[0m');
        console.log(url);  // FIXME
        // TODO: Add support for multiple downloads
        log.warn('Currently multiple downloads from URLs are not suppported');
        process.exit(0);
      } else {
        log.info('\x1b[95mMode: \x1b[97mSingle Download\x1b[0m');
        downloadSucceed = !!await ytmp3.singleDownload(url[0], downloadOptions);
      }
    }
  } catch (dlErr) {
    log.error(dlErr.message);
    console.error(dlErr.stack);
    process.exit(1);
  }

  if (downloadSucceed) {
    log.info(`Downloaded files saved at \x1b[93m${downloadOptions.outDir}\x1b[0m`);
  }
}


module.exports = Object.freeze({
  // :: ytmp3 (Core)
  name: ytmp3.name,
  version: ytmp3.version,
  singleDownload: ytmp3.singleDownload,
  batchDownload: ytmp3.batchDownload,
  getVideosInfo: ytmp3.getVideosInfo,
  // :: audioconv
  defaultAudioConvOptions,
  checkFfmpeg,
  convertAudio,
});


if (require.main === module) {
  main();
}
