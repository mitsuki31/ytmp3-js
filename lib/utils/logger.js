/**
 * Utility submodule for logging process.
 *
 * @module    utils/logger
 * @requires  utils/colors
 * @requires  utils/type-utils
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     1.2.0
 */

'use strict';

const { Writable } = require('node:stream');
const { stripVTControlCharacters } = require('node:util');
const { style } = require('./colors');
const { InvalidTypeError } = require('../error');
const TypeUtils = require('./type-utils');


function customDateFormat(date) {
  const time = date.toLocaleTimeString('en-US', { hour12: false });
  const millis = `${date.getMilliseconds()}`.padStart(3, 0);

  return `[${time}.${millis}]`;
}

/**
 * Removes all ANSI escape codes if the given stream is not TTY.
 *
 * @param {string} text
 * @param {WritableStream} stream
 * @returns {string}
 * @private
 * @since  2.0.0
 */
function stripIfNotTTY(text, stream) {
  stream = stream || process.stdout;
  return stream.isTTY ? text : stripVTControlCharacters(text);
}


/**
 * @classdesc A custom logger object for the **YTMP3-JS** library with ANSI color codes.
 *
 * The logger is using the ANSI color codes to add color to the log messages,
 * it might not support on every terminals.
 *
 * @class
 * @hideconstructor
 * @package
 * @since    1.0.0
 */
const Logger = {};

/**
 * The prefix for the info level message.
 * @type    {string}
 * @default <pre class=str>'\x1b[96m[INFO]\x1b[0m'</pre>
 * @since   1.0.0
 */
Logger.INFO_PREFIX = style([0, 'BC'], '[INFO]');

/**
 * The prefix for the done level message.
 * @type    {string}
 * @default <pre class=str>'\x1b[92m[DONE]\x1b[0m'</pre>
 * @since   1.0.0
 */
Logger.DONE_PREFIX = style([0, 'BG'], '[DONE]');

/**
 * The prefix for the debug level message.
 * @type    {string}
 * @default <pre class=str>'\x1b[2;37m[DEBUG]\x1b[0m'</pre>
 * @since   1.0.0
 */
Logger.DEBUG_PREFIX = style([0, '~', 'W'], '[DEBUG]');

/**
 * The prefix for the warning level message.
 * @type    {string}
 * @default <pre class=str>'\x1b[93m[WARNING]\x1b[0m'</pre>
 * @since   1.0.0
 */
Logger.WARNING_PREFIX = style([0, 'BY'], '[WARNING]');

/**
 * The prefix for the error level message.
 * @type    {string}
 * @default <pre class=str>'\x1b[91m[ERROR]\x1b[0m'</pre>
 * @since   1.0.0
 */
Logger.ERROR_PREFIX = style([0, 'BR'], '[ERROR]');

/**
 * The function to log the **info** level message to the console.
 *
 * @param     {string[]} [msg] - The message string to log.
 *
 * @function
 * @package
 * @since     1.0.0
 */
Logger.info = function info(...msg) {
  const prefix = ((process.stdout.columns >= 75)
    ? style([0, '~'], `${customDateFormat(new Date())}::`) : '') + Logger.INFO_PREFIX;
  console.log(stripIfNotTTY(prefix + msg.join(' '), process.stdout));
};

/**
 * The function to log the **done** level message to the console.
 *
 * @param     {string[]} [msg] - The message string to log.
 * @returns   {void}
 *
 * @function
 * @package
 * @since     1.0.0
 */
Logger.done = function done(...msg) {
  const prefix = ((process.stdout.columns >= 75)
    ? style([0, '~'], `${customDateFormat(new Date())}::`) : '') + Logger.DONE_PREFIX;
  console.log(stripIfNotTTY(prefix + msg.join(' '), process.stdout));
};

/**
 * The function to log the **debug** level message to the console.
 *
 * @param     {string[]} [msg] - The message string to log.
 * @returns   {void}
 *
 * @function
 * @package
 * @since     1.0.0
 */
Logger.debug = function debug(...msg) {
  const prefix = ((process.stdout.columns >= 75)
    ? style([0, '~'], `${customDateFormat(new Date())}::`) : '') + Logger.DEBUG_PREFIX;
  console.log(stripIfNotTTY(prefix + msg.join(' '), process.stdout));
};

/**
 * The function to log the **warning** level message to the console.
 *
 * @param     {string[]} [msg] - The message string to log.
 * @returns   {void}
 *
 * @function
 * @package
 * @since     1.0.0
 */
Logger.warn = function warn(...msg) {
  const prefix = ((process.stderr.columns >= 75)
    ? style([0, '~'], `${customDateFormat(new Date())}::`) : '') + Logger.WARNING_PREFIX;
  console.error(stripIfNotTTY(prefix + msg.join(' '), process.stderr));
};

/**
 * The function to log the **error** level message to the console.
 *
 * @param     {string[]} [msg] - The message string to log.
 * @returns   {void}
 *
 * @function
 * @package
 * @since     1.0.0
 */
Logger.error = function error(...msg) {
  const prefix = ((process.stderr.columns >= 75)
    ? style([0, '~'], `${customDateFormat(new Date())}::`) : '') + Logger.ERROR_PREFIX;
  console.error(stripIfNotTTY(prefix + msg.join(' '), process.stderr));
};

/**
 * A function to create a line to log.
 *
 * @returns {void}
 *
 * @function
 * @package
 * @since    2.0.0
 */
Logger.line = function line() {
  const len = process.stdout.columns;
  Logger.info('-'.repeat(((len >= 75) ? (len / 2 + 15) : (len - 8))));
};

/**
 * Writes a log message to the specified writable stream with an optional prefix.
 *
 * This function is responsible for formatting and writing log messages, automatically handling:
 * - Stream selection (defaults to `process.stdout` if none is provided).
 * - Prefix generation based on the stream type (TTY or non-TTY output).
 * - Ensuring ANSI escape codes (colors, styles) are only applied if the stream supports TTY.
 * - Handling closed streams by logging an error and throwing an exception to standard error stream.
 *
 * #### Prefix and Text Style Behavior
 * - If no prefix is provided, it generates one based on the current timestamp and attaches
 *   a default log info prefix.
 * - When writing to a TTY stream (e.g., `stdout` or `stderr` in an interactive terminal),
 *   ANSI styles are applied for better visibility.
 * - If the stream is **not** TTY (e.g., writing to a file), ANSI styles are stripped for readability.
 *
 * #### Stream Handling
 * - If `stream` is a nullable value or not a writable stream, it defaults to `process.stdout`.
 * - If `stream` is already closed, an error is logged, and an exception is thrown.
 *
 * @param {string} msg - The log message to be written.
 * @param {string | Writable} [prefix] - Optional prefix for the log message. If not provided, it is auto-generated.
 *                                       If a writable stream is given, it will treated as `stream`` argument.
 * @param {Writable} [stream] - The writable stream where the message should be written.
 *                              Defaults to `process.stdout` if not specified.
 *
 * @throws {InvalidTypeError} If both the `prefix` and `stream` argument are specified as writable stream.
 * @throws {Error} If the provided stream is closed.
 *
 * @example <caption> Basic usage with default stream (stdout) and prefix </caption>
 * Logger.write('Hello, World!');
 *
 * @example <caption> Custom prefix and stream </caption>
 * const fs = require('fs');
 * const logFile = fs.createWriteStream('log.txt');
 * Logger.write('File logging enabled', '[CUSTOM]', logFile);
 *
 * @package
 * @since 2.0.0
 * @see {@link module:utils/logger~Logger.info Logger.info}
 * @see {@link module:utils/logger~Logger.done Logger.done}
 * @see {@link module:utils/logger~Logger.warn Logger.warn}
 * @see {@link module:utils/logger~Logger.error Logger.error}
 */
Logger.write = function write(msg, prefix, stream) {
  let isTTY;

  // Override colors.style function
  function style(format, ...texts) {
    return isTTY ? style(format, ...texts) : texts.join(' ');
  }

  if (prefix instanceof Writable && (typeof stream === 'undefined')) {
    stream = prefix;
    prefix = null;
  } else if (prefix instanceof Writable && stream instanceof Writable) {
    throw new InvalidTypeError(
      "Invalid type for 'prefix' argument. Did you mean to pass `WritableStream`?"
    );
  }

  stream = !(stream && (stream instanceof Writable))
    ? process.stdout  // Use standard output as fallback
    : stream;

  if (stream.closed) {
    Logger.error('Stream is closed, cannot write log');
    throw new Error('Stream is closed, cannot write log');
  }

  if (!prefix) {
    isTTY = stream?.isTTY === true;
    // Check if the stream is standard output
    if ((stream.closed === false)
      && (typeof stream?.path === 'undefined')  // standard output streams does not define this
      && (typeof stream?.isTTY === 'boolean')   // stdout and stderr always have this
      && ((stream?.columns || 0) >= 75)         // and also for this
    ) {
      prefix = style([0, '~'], `${customDateFormat(new Date())}::`);
    } else {
      prefix = `${customDateFormat(new Date())}::`;
    }

    // Concat and remove the ANSI escape codes if not TTY
    prefix = stripIfNotTTY(prefix + Logger.INFO_PREFIX, stream);
  }

  // Concat the message and strip ANSI escape codes if not TTY
  msg = `${prefix} ${stripIfNotTTY(msg, stream)}`;
  stream.write(msg);  // Attempt to write into stream
};

Logger.log = Logger;     // Circular reference #1 (new alias)
Logger.logger = Logger;  // Circular reference #2 (for backward compatibility)

// Export the `Logger` object with the circular references
module.exports = Logger;
