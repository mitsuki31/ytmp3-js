/**
 * Utility submodule for logging process.
 *
 * @module    utils/logger
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     1.2.0
 */

'use strict';

function customDateFormat(date) {
  const time = date.toLocaleTimeString('en-US', { hour12: false });
  const millis = `${date.getMilliseconds()}`.padStart(3, 0);

  return `[${time}.${millis}]`;
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
Logger.INFO_PREFIX     = '\x1b[96m[INFO]\x1b[0m';

/**
 * The prefix for the done level message.
 * @type    {string}
 * @default <pre class=str>'\x1b[92m[DONE]\x1b[0m'</pre>
 * @since   1.0.0
 */
Logger.DONE_PREFIX     = '\x1b[92m[DONE]\x1b[0m';

/**
 * The prefix for the debug level message.
 * @type    {string}
 * @default <pre class=str>'\x1b[2;37m[DEBUG]\x1b[0m'</pre>
 * @since   1.0.0
 */
Logger.DEBUG_PREFIX    = '\x1b[2;37m[DEBUG]\x1b[0m';

/**
 * The prefix for the warning level message.
 * @type    {string}
 * @default <pre class=str>'\x1b[93m[WARNING]\x1b[0m'</pre>
 * @since   1.0.0
 */
Logger.WARNING_PREFIX  = '\x1b[93m[WARNING]\x1b[0m';

/**
 * The prefix for the error level message.
 * @type    {string}
 * @default <pre class=str>'\x1b[91m[ERROR]\x1b[0m'</pre>
 * @since   1.0.0
 */
Logger.ERROR_PREFIX    = '\x1b[91m[ERROR]\x1b[0m';

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
  const prefix = (process.stdout.columns >= 75)
    ? `\x1b[2m${customDateFormat(new Date())}::\x1b[0m` : '';
  console.log(`${prefix}${Logger.INFO_PREFIX}`, ...msg);
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
  const prefix = (process.stdout.columns >= 75)
    ? `\x1b[2m${customDateFormat(new Date())}::\x1b[0m` : '';
  console.log(`${prefix}${Logger.DONE_PREFIX}`, ...msg);
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
  const prefix = (process.stdout.columns >= 75)
    ? `\x1b[2m${customDateFormat(new Date())}::\x1b[0m` : '';
  console.log(`${prefix}${Logger.DEBUG_PREFIX}`, ...msg);
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
  const prefix = (process.stdout.columns >= 75)
    ? `\x1b[2m${customDateFormat(new Date())}::\x1b[0m` : '';
  console.error(`${prefix}${this.WARNING_PREFIX}`, ...msg);
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
  const prefix = (process.stdout.columns >= 75)
    ? `\x1b[2m${customDateFormat(new Date())}::\x1b[0m` : '';
  console.error(`${prefix}${this.ERROR_PREFIX}`, ...msg);
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
  let len = process.stdout.columns;
  len = (process.stdout.columns >= 75) ? (len / 2 + 15) : (len - 8);
  Logger.info('-'.repeat(len));
};

Logger.log = Logger;     // Circular reference #1 (new alias)
Logger.logger = Logger;  // Circular reference #2 (for backward compatibility)

// Export the `Logger` object with the circular references
module.exports = Logger;
