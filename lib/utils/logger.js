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
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const time = date.toLocaleTimeString('en-US', { hour12: false });
  const timezoneOffset = -date.getTimezoneOffset();
  const timezoneSign = timezoneOffset >= 0 ? '+' : '-';
  const timezoneHours = Math.abs(Math.floor(timezoneOffset / 60));

  return `[${month}-${day}|${time}@${timezoneSign}${timezoneHours}]`;
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
 * @param     {string} [msg] - The message string to log.
 *
 * @function
 * @package
 * @since     1.0.0
 */
Logger.info = function info(msg) {
  console.log(`\x1b[2m${customDateFormat(new Date())}`
    + `::\x1b[0m${Logger.INFO_PREFIX} ${msg}`);
};

/**
 * The function to log the **done** level message to the console.
 *
 * @param     {string} [msg] - The message string to log.
 * @returns   {void}
 *
 * @function
 * @package
 * @since     1.0.0
 */
Logger.done = function done(msg) {
  console.log(`\x1b[2m${customDateFormat(new Date())}::`
    + `\x1b[0m${Logger.DONE_PREFIX} ${msg}`);
};

/**
 * The function to log the **debug** level message to the console.
 *
 * @param     {string} [msg] - The message string to log.
 * @returns   {void}
 *
 * @function
 * @package
 * @since     1.0.0
 */
Logger.debug = function debug(msg) {
  console.log(`\x1b[2m${customDateFormat(new Date())}::`
    + `\x1b[0m${Logger.DEBUG_PREFIX} ${msg}`);
};

/**
 * The function to log the **warning** level message to the console.
 *
 * @param     {string} [msg] - The message string to log.
 * @returns   {void}
 *
 * @function
 * @package
 * @since     1.0.0
 */
Logger.warn = function warn(msg) {
  console.error(`\x1b[0m\x1b[2m${customDateFormat(new Date())}`
    + `::\x1b[0m${this.WARNING_PREFIX} ${msg}`);
};

/**
 * The function to log the **error** level message to the console.
 *
 * @param     {string} [msg] - The message string to log.
 * @returns   {void}
 *
 * @function
 * @package
 * @since     1.0.0
 */
Logger.error = function error(msg) {
  console.error(`\x1b[0m\x1b[2m${customDateFormat(new Date())}`
    + `::\x1b[0m${this.ERROR_PREFIX} ${msg}`);
};

Logger.log = Logger;     // Circular reference #1 (new alias)
Logger.logger = Logger;  // Circular reference #2 (for backward compatibility)

// Export the `Logger` object with the circular references
module.exports = Logger;
