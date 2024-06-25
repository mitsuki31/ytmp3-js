/**
 * Utilities module for **YTMP3** project.
 *
 * @module    utils
 * @author    Ryuu Mitsuki (https://github.com/mitsuki31)
 * @license   MIT
 * @since     1.0.0
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * The logger object for the `ytmp3` module with ASCII color codes.
 *
 * @typedef  {Object} Logger
 * @property {string} INFO_PREFIX - The prefix for the info level message.
 * @property {string} DONE_PREFIX - The prefix for the done level message.
 * @property {string} DEBUG_PREFIX - The prefix for the debug level message.
 * @property {string} WARNING_PREFIX - The prefix for the warning level message.
 * @property {string} ERROR_PREFIX - The prefix for the error level message.
 * @property {(msg: string) => void} info - The function to log the info level message to the console.
 * @property {(msg: string) => void} done - The function to log the done level message to the console.
 * @property {(msg: string) => void} debug - The function to log the debug level message to the console.
 * @property {(msg: string) => void} warn - The function to log the warning level message to the console.
 * @property {(msg: string) => void} error - The function to log the error level message to the console.
 * @since    1.0.0
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


const FrozenProperty = {
  writable: false,
  configurable: false,
  enumerable: true
};

/** The root directory of the project. */
const ROOTDIR = path.join(__dirname, '..');
/** The output directory for the downloaded audio files. */
const OUTDIR = path.join(ROOTDIR, 'download');
/** The log directory for the download error logs. */
const LOGDIR = path.join(ROOTDIR, 'log');


/**
 * Synchronously checks whether the specified directory path is exist,
 * creates new if not exist with asynchronous operation.
 *
 * @async
 * @public
 * @since  1.0.0
 */
async function createDirIfNotExist(dirpath) {
  if (!fs.existsSync(dirpath)) await fs.promises.mkdir(dirpath);
}

/**
 * A custom logger object for the `ytmp3` module with ANSI color codes.
 *
 * The logger is using the ANSI color codes to add color to the log messages,
 * it might not support on every terminals.
 *
 * @constant
 * @type   {Logger}
 * @since  1.0.0
 */
const logger = Object.create(null);
Object.defineProperties(logger, {
  INFO_PREFIX: { value: '\x1b[96m[INFO]\x1b[0m', ...FrozenProperty },
  DONE_PREFIX: { value: '\x1b[92m[DONE]\x1b[0m', ...FrozenProperty },
  DEBUG_PREFIX: { value: '\x1b[2;37m[DEBUG]\x1b[0m', ...FrozenProperty },
  WARNING_PREFIX: { value: '\x1b[93m[WARNING]\x1b[0m', ...FrozenProperty },
  ERROR_PREFIX: { value: '\x1b[91m[ERROR]\x1b[0m', ...FrozenProperty },
  info: {
    value: function (msg) {
      console.log(`${this.INFO_PREFIX} ${msg}`);
    },
    ...FrozenProperty
  },
  done: {
    value: function (msg) {
      console.log(`${this.DONE_PREFIX} ${msg}`);
    },
    ...FrozenProperty
  },
  debug: {
    value: function (msg) {
      console.log(`${this.DEBUG_PREFIX} ${msg}`);
    },
    ...FrozenProperty
  },
  warn: {
    value: function (msg) {
      console.error(`${this.WARNING_PREFIX} ${msg}`);
    },
    ...FrozenProperty
  },
  error: {
    value: function (msg) {
      console.error(`${this.ERROR_PREFIX} ${msg}`);
    },
    ...FrozenProperty
  }
});

/**
 * Class representing a progress bar for downloads.
 * @constant
 * @since 1.0.0
 */
class ProgressBar {
  /**
   * Initialize the `ProgressBar` class with specific options to configure the
   * progress bar.
   *
   * @param {ProgressBarOptions} options
   *        Options object for configuring the progress bar.
   * @since 1.0.0
   */
  constructor (options) {
    /**
     * Options object for configuring the progress bar.
     * @type {{ [P in keyof ProgressBarOptions]-?: Exclude<ProgressBarOptions[P], null | undefined> }}
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
     */
    this.loadings = [ '\\', '|', '/', '-' ];
  }

  /**
   * Creates a string formatted download progress bar with centered percentage.
   *
   * @param {number} bytesDownloaded - The number of bytes downloaded so far.
   * @param {number} totalBytes - The total number of bytes to download.
   * @returns {string} The formatted progress bar string with percentage and byte information.
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


module.exports = Object.freeze({
  ROOTDIR, OUTDIR, LOGDIR,
  logger,
  ProgressBar,
  createDirIfNotExist
});
