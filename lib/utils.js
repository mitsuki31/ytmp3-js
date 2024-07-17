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
 * @typedef {Function} LoggerFunc
 * @param   {string} msg - The message to be displayed.
 * @returns {void}
 * @since   1.0.0
 */

/**
 * The interface of {@link module:utils~logger `logger`} object.
 *
 * @typedef  {Object} LoggerInterface
 * @property {string} INFO_PREFIX - The prefix for the info level message.
 * @property {string} DONE_PREFIX - The prefix for the done level message.
 * @property {string} DEBUG_PREFIX - The prefix for the debug level message.
 * @property {string} WARNING_PREFIX - The prefix for the warning level message.
 * @property {string} ERROR_PREFIX - The prefix for the error level message.
 * @property {LoggerFunc} info - The function to log the info level message to the console.
 * @property {LoggerFunc} done - The function to log the done level message to the console.
 * @property {LoggerFunc} debug - The function to log the debug level message to the console.
 * @property {LoggerFunc} warn - The function to log the warning level message to the console.
 * @property {LoggerFunc} error - The function to log the error level message to the console.
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
 * @param  {string} dirpath - The directory path to be created if not exist.
 * @returns {Promise<void>}
 *
 * @async
 * @public
 * @since  1.0.0
 */
async function createDirIfNotExist(dirpath) {
  if (!fs.existsSync(dirpath)) await fs.promises.mkdir(dirpath);
}

/**
 * **Logger Namespace**
 * @namespace module:utils~Logger
 * @public
 * @since  1.0.0
 */

/**
 * Checks if a given value is null or undefined.
 *
 * @param {any} x - The value to check.
 * @returns {boolean} - `true` if the value is null or undefined, otherwise `false`.
 *
 * @public
 * @since  1.0.0
 */
function isNullOrUndefined(x) {
  return (x === null || typeof x === 'undefined');
}

/**
 * Checks if a given value is an object type.
 *
 * This function will strictly checks whether the given value is an object, not `null`,
 * `Array`, a `RegExp` instance, neither a `URL` instance.
 *
 * @param {any} x - The value to check.
 * @returns {boolean} - `true` if the value is an object and not null, an array,
 *                      a `RegExp`, nor a URL object, otherwise false.
 *
 * @public
 * @since  1.0.0
 */
function isObject(x) {
  return (!isNullOrUndefined(x)
    && !Array.isArray(x)
    && !(x instanceof RegExp)
    && !(x instanceof URL)
    && typeof x === 'object'
  );
}

/**
 * A custom logger object for the **YTMP3** project with ANSI color codes.
 *
 * The logger is using the ANSI color codes to add color to the log messages,
 * it might not support on every terminals.
 *
 * @constant
 * @type {module:utils~Logger}
 * @public
 * @since  1.0.0
 * @see    {@link module:utils~Logger Logger (namespace)}
 * @see    {@link module:utils~LoggerInterface LoggerInterface}
 */
const logger = Object.create(null);
Object.defineProperties(logger, {
  /**
   * The prefix for the info level message.
   * @memberof module:utils~Logger
   * @var {string}
   * @default <pre class=str>'\x1b[96m[INFO]\x1b[0m'</pre>
   */
  INFO_PREFIX: { value: '\x1b[96m[INFO]\x1b[0m', ...FrozenProperty },
  /**
   * The prefix for the done level message.
   * @memberof module:utils~Logger
   * @var {string}
   * @default <pre class=str>'\x1b[92m[DONE]\x1b[0m'</pre>
   */
  DONE_PREFIX: { value: '\x1b[92m[DONE]\x1b[0m', ...FrozenProperty },
  /**
   * The prefix for the debug level message.
   * @memberof module:utils~Logger
   * @var {string}
   * @default <pre class=str>'\x1b[2;37m[DEBUG]\x1b[0m'</pre>
   */
  DEBUG_PREFIX: { value: '\x1b[2;37m[DEBUG]\x1b[0m', ...FrozenProperty },
  /**
   * The prefix for the warning level message.
   * @memberof module:utils~Logger
   * @var {string}
   * @default <pre class=str>'\x1b[93m[WARNING]\x1b[0m'</pre>
   */
  WARNING_PREFIX: { value: '\x1b[93m[WARNING]\x1b[0m', ...FrozenProperty },
  /**
   * The prefix for the error level message.
   * @memberof module:utils~Logger
   * @var {string}
   * @default <pre class=str>'\x1b[91m[ERROR]\x1b[0m'</pre>
   */
  ERROR_PREFIX: { value: '\x1b[91m[ERROR]\x1b[0m', ...FrozenProperty },
  /**
   * The function to log the info level message to the console.
   * @memberof module:utils~Logger
   * @var {LoggerFunc}
   * @function
   */
  info: {
    value: function (msg) {
      console.log(`${this.INFO_PREFIX} ${msg}`);
    },
    ...FrozenProperty
  },
  /**
   * The function to log the done level message to the console.
   * @memberof module:utils~Logger
   * @function
   * @param {string} msg - The message string to be displayed.
   * @returns {void}
   */
  done: {
    value: function (msg) {
      console.log(`${this.DONE_PREFIX} ${msg}`);
    },
    ...FrozenProperty
  },
  /**
   * The function to log the debug level message to the console.
   * @memberof module:utils~Logger
   * @function
   * @param {string} msg - The message string to be displayed.
   * @returns {void}
   */
  debug: {
    value: function (msg) {
      console.log(`${this.DEBUG_PREFIX} ${msg}`);
    },
    ...FrozenProperty
  },
  /**
   * The function to log the warning level message to the console.
   * @memberof module:utils~Logger
   * @function
   * @param {string} msg - The message string to be displayed.
   * @returns {void}
   */
  warn: {
    value: function (msg) {
      console.error(`${this.WARNING_PREFIX} ${msg}`);
    },
    ...FrozenProperty
  },
  /**
   * The function to log the error level message to the console.
   * @memberof module:utils~Logger
   * @function
   * @param {string} msg - The message string to be displayed.
   * @returns {void}
   */
  error: {
    value: function (msg) {
      console.error(`${this.ERROR_PREFIX} ${msg}`);
    },
    ...FrozenProperty
  }
});


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
   * @since 1.0.0
   */
  constructor (options) {
    /**
     * Options object for configuring the progress bar.
     * @var {ResolvedProgressBarOptions}
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
     * @var {number}
     */
    this.idxLoading = 0;
    /**
     * Characters for the loading animation.
     * @var {'\\' | '|' | '/' | '-'}
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


/**
 * Drops null and undefined values from the input object.
 *
 * @param {Object} obj - The input object to filter null and undefined values from.
 * @return {Object} The filtered object without null and undefined values.
 *
 * @public
 * @since  1.0.0
 */
function dropNullAndUndefined(obj) {
  return Object.keys(obj).reduce((acc, key) => {
    if (!isNullOrUndefined(obj[key])) acc[key] = obj[key];
    return acc;
  }, {});
}


module.exports = Object.freeze({
  ROOTDIR, OUTDIR, LOGDIR,
  logger,
  isNullOrUndefined,
  isObject,
  ProgressBar,
  createDirIfNotExist,
  dropNullAndUndefined
});
