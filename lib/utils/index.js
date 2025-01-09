/**
 * Main entry for `utils` module of **YTMP3-JS** project.
 *
 * This module provides a set of submodules for working with various utilities.
 * These submodules are:
 *
 * - {@link module:utils/logger} - A submodule for logging process.
 * - {@link module:utils/yt-urlfmt} - A submodule containing all supported YouTube URLs in regular expressions (_deprecated_).
 * - {@link module:utils/url-utils} - A submodule for working with YouTube URLs.
 * - {@link module:utils/type-utils} - A submodule for type checking and utility functions.
 *
 * @module    utils
 * @requires  utils/logger
 * @requires  utils/yt-urlfmt
 * @requires  utils/url-utils
 * @requires  utils/type-utils
 * @requires  utils/format-utils
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     1.0.0
 */


/**
 * Options object for configuring the progress bar.
 *
 * @typedef  {Object}          ProgressBarOptions
 * @property {'auto' | number} [barWidth='auto'] - The width of the progress bar. Can be `'auto'`
 *                                                 or a number representing the number of characters.
 * @property {string}          [barCharElapsed='#'] - The character used to represent the progress of the bar.
 * @property {string}          [barCharTotal='-'] - The character used to represent the total length of the bar.
 * @property {boolean}         [bytesInfo=true] - Whether to display the bytes downloaded information in MB.
 * @since    1.0.0
 */

/**
 * The resolved {@link module:utils~ProgressBarOptions ProgressBarOptions} options.
 *
 * @typedef  {ProgressBarOptions} ResolvedProgressBarOptions
 * @property {'auto' | number}    barWidth - The width of the progress bar. Can be `'auto'`
 *                                           or a number representing the number of characters.
 * @property {string}             barCharElapsed - The character used to represent the progress of the bar.
 * @property {string}             barCharTotal - The character used to represent the total length of the bar.
 * @property {boolean}            bytesInfo - Whether to display the bytes downloaded information in MB.
 * @since    1.0.0
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Local imports
const Logger = require('./logger');
const TypeUtils = require('./type-utils');
const URLFmt = require('./yt-urlfmt');
const URLUtils = require('./url-utils');
const FormatUtils = require('./format-utils');


// region Constants

/**
 * The root directory of the project.
 * @type {string}
 * @constant
 * @package
 * @since  1.0.0
 */
const ROOTDIR = path.join(__dirname, '..', '..');

/**
 * The output directory for the downloaded audio files.
 * @type {string}
 * @constant
 * @package
 * @since  1.0.0
 */
const OUTDIR = path.join(ROOTDIR, 'download');

/**
 * The home directory path for the YTMP3-JS configuration and data files.
 *
 * This path is constructed by joining the user's home directory with the `'.ytmp3-js'` folder.
 * On POSIX systems, this will typically be `"/home/<USERNAME>/.ytmp3-js"`, while on Windows systems,
 * it will be `"C:\Users\<USERNAME>\.ytmp3-js"`. For Termux Android, it will be
 * `"/data/data/com.termux/files/home/.ytmp3-js"`.
 *
 * @type {string}
 * @constant
 * @package
 * @since    1.1.0
 */
const YTMP3_HOMEDIR = path.join(os.homedir(), '.ytmp3-js');

/**
 * The log directory for error logs.
 *
 * Basically, the log directory is set to:
 *   - **POSIX**: `$HOME/.ytmp3-js/logs`
 *   - **Windows**: `%USERPROFILE%\.ytmp3-js\logs`
 *
 * @type {string}
 * @constant
 * @package
 * @since  1.0.0
 */
const LOGDIR = path.join(YTMP3_HOMEDIR, 'logs');


// region Utilities Function

/**
 * Synchronously checks whether the specified directory path is exist,
 * creates new if not exist with asynchronous operation.
 *
 * @param  {string} dirpath - The directory path to be created if not exist.
 * @returns {Promise<void>}
 *
 * @async
 * @package
 * @since  1.0.0
 */
async function createDirIfNotExist(dirpath) {
  if (!fs.existsSync(dirpath)) await fs.promises.mkdir(dirpath, { recursive: true });
}

/**
 * Similar with {@link module:utils~createDirIfNotExist `createDirIfNotExist`}
 * function, but it uses synchronous directory creation.
 *
 * @package
 * @since 1.0.1
 */
function createDirIfNotExistSync(dirpath) {
  if (!fs.existsSync(dirpath)) fs.mkdirSync(dirpath, { recursive: true });
}

/**
 * Creates the error log file with the specified prefix.
 * If the prefix is not specified, it will use `'ytmp3Error'` as the prefix.
 *
 * @param {string} [prefix='ytmp3Error'] - The prefix of the error log file.
 *
 * @return {string} The created error log file.
 * @private
 * @since  1.0.0
 */
function createLogFile(prefix) {
  return `${prefix || 'ytmp3Error'}-${
    (new Date()).toISOString().split('.')[0].replace(/:/g, '.')}.log`;
}


// region Utilities Class

class ProgressBar {
  /**
   * Initialize the `ProgressBar` class with specific options to configure the
   * progress bar.
   *
   * @classdesc Class representing a progress bar for downloads.
   *
   * @class
   * @param {ProgressBarOptions} options
   *        Options object for configuring the progress bar.
   * @package
   * @since 1.0.0
   */
  constructor (options) {
    /**
     * Options object for configuring the progress bar.
     * @type {ResolvedProgressBarOptions}
     */
    this.options = {
      barWidth: (typeof options?.barWidth === 'string'
                      || typeof options?.barWidth === 'number')
        ? options.barWidth : 'auto',
      barCharElapsed: (typeof options?.barCharElapsed === 'string')
        ? options.barCharElapsed
        : '#',
      barCharTotal: (typeof options?.barCharTotal === 'string')
        ? options.barCharTotal
        : '-',
      bytesInfo: (typeof options?.bytesInfo === 'boolean')
        ? options.bytesInfo === true
        : true
    };
    /**
     * Index for the loading animation.
     * @type {number}
     */
    this.idxLoading = 0;
    /**
     * Characters for the loading animation.
     * @type {'\\' | '|' | '/' | '-'}
     * @default
     */
    this.loadings = [ '\\', '|', '/', '-' ];
  }

  /**
   * Creates a string formatted download progress bar with centered percentage.
   *
   * @method
   * @param {number} bytesDownloaded - The number of bytes downloaded so far.
   * @param {number} totalBytes - The total number of bytes to download.
   *
   * @returns {string} The formatted progress bar string with percentage and byte information.
   *
   * @since  1.0.0
   */
  create(bytesDownloaded, totalBytes) {
    const {
      barCharElapsed,
      barCharTotal
    } = this.options;
    let barWidth = parseBarWidth(this.options.barWidth);
    barWidth = Math.round(barWidth / ((barWidth > 60) ? 1.85 : 2.25));
    this.idxLoading = (this.idxLoading >= this.loadings.length)
      ? 0
      : this.idxLoading;
    const loading = this.loadings[this.idxLoading++];

    /**
     * Parses the bar width option.
     *
     * @private
     * @param {string | number} val - The bar width value to parse.
     * @returns {number} The parsed bar width as a number.
     */
    function parseBarWidth(val) {
      return (!val || (typeof val === 'string' && val === 'auto'))
        ? ('columns' in process.stdout)
          ? Math.min(100, process.stdout.columns)
          : 40
        : val;
    }

    // Calculate the progress percentage
    const progress = Math.max(0, Math.min(100, Math.floor(
      bytesDownloaded / totalBytes * 100
    )));
    const progressStr = ` [${progress}%] `;
    // Calculate the number of characters to fill in the progress bar
    const progressBarWidth = Math.floor(barWidth * (progress / 100));

    // Calculate where to start the progress bar and the percentage text
    const progressBarStart = Math.max(0, progressBarWidth);
    const percentagePos = Math.max(0, Math.min(barWidth - 4,
      Math.floor((barWidth - 4) / 2)));

    // Create the progress bar string with centered percentage
    let progressBar = `[${barCharElapsed.repeat(progressBarStart)}${
      barCharTotal.repeat(barWidth - progressBarWidth)
    }]`;
    progressBar = progressBar.substring(0, percentagePos) +
      ((progress < 100) ? '\x1b[0;96m' : '\x1b[0;92m') +
      `${progressStr}\x1b[0m\x1b[1m` +
      progressBar.substring(percentagePos + progressStr.length);

    // Calculate the number of bytes downloaded in MB
    const byteInfo = `[${
      (bytesDownloaded / (1024 * 1024)).toFixed(2)
    }/${(totalBytes / (1024 * 1024)).toFixed(2)} MB]`;

    // Return the formatted progress bar with percentage
    return (progress < 100)
      // eslint-disable-next-line max-len
      ? `\x1b[K\x1b[1;93m[...]\x1b[0m \x1b[1m${progressBar} \x1b[0;93m[${loading}]\x1b[0m \x1b[1;95m${byteInfo}\x1b[0m\r`
      // eslint-disable-next-line max-len
      : `\x1b[K\x1b[1;92m[DONE]\x1b[0m \x1b[1m${progressBar} \x1b[0;92m[\u2714]\x1b[0m \x1b[1;95m${byteInfo}\x1b[0m\n`;
  }
}


module.exports = {
  // Logger module
  Logger,
  log: Logger.log,
  logger: Logger.logger,

  // TypeUtils module
  TypeUtils,
  ...TypeUtils,

  // URLUtils module
  URLUtils,
  // URLFmt module
  URLFmt,

  // FormatUtils module
  FormatUtils: FormatUtils.FormatUtils,
  DateFormatter: FormatUtils.DateFormatter,

  // Utils (this) module
  ROOTDIR, OUTDIR, LOGDIR, YTMP3_HOMEDIR,
  createDirIfNotExist,
  createDirIfNotExistSync,
  createLogFile,
  ProgressBar
};
