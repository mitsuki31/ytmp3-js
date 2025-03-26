/**
 * Utility submodule for logging process.
 *
 * @module    utils/logger
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     1.2.0
 */

'use strict';

const { stripVTControlCharacters } = require('node:util');
const { style } = require('./colors');
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

Logger.log = Logger;     // Circular reference #1 (new alias)
Logger.logger = Logger;  // Circular reference #2 (for backward compatibility)

// Export the `Logger` object with the circular references
module.exports = Logger;
