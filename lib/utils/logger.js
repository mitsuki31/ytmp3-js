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


// * HACK: THIS MODULE HAS SPECIAL CASE TO GET THE GLOBAL ENVIRONMENT
const NO_COLOR = ['YTMP3__NO_COLOR', 'NO_COLOR'].reduce((acc, name) => {
  const TRUTHY = ['true', 'TRUE', 'True', '1', 'y', 'Y', 'yes', 'YES', 'Yes'];
  if (typeof process.env[name] !== 'undefined'
      || (typeof process.env[name] === 'string' && process.env[name].trim() !== '')) {
    if (name === 'YTMP3__NO_COLOR' && TRUTHY.includes(process.env[name])) process.env.NO_COLOR = process.env[name];
    if (!acc && TRUTHY.includes(process.env[name])) acc = !acc;
  }
  return acc;
}, false);

function customDateFormat(date) {
  const time = date.toLocaleTimeString('en-US', { hour12: false });
  const millis = `${date.getMilliseconds()}`.padStart(3, 0);

  return `[${time}.${millis}]`;
}

/**
 * @param {Writable} stream
 * @returns {boolean}
 * @private
 */
function isStreamClosed(stream) {
  return stream instanceof Writable && stream.closed;
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
 * Enum-like constant representing log levels with bitwise values.
 * This is used to categorize and control log output levels.
 *
 * @namespace module:utils/logger~Logger.LOG_LEVELS
 * @readonly
 * @package
 * @since     2.0.0
 */
Logger.LOG_LEVELS = Object.freeze({
  __proto__: null,

  /**
   * Represents no logging level. Used to disable logging.
   *
   * @type     {number}
   * @memberof module:utils/logger~Logger.LOG_LEVELS
   * @default  0
   */
  NONE: 0x00 << 4,

  /**
   * Debug level logging. Used for detailed debugging information.
   *
   * @type     {number}
   * @memberof module:utils/logger~Logger.LOG_LEVELS
   * @default  2040
   */
  DEBUG: 0xff << 3,

  /**
   * Informational level logging. Used for general operational messages.
   *
   * @type     {number}
   * @memberof module:utils/logger~Logger.LOG_LEVELS
   * @default  1020
   */
  INFO: 0xff << 2,

  /**
   * Warning level logging. Used for non-critical issues that need attention.
   *
   * @type     {number}
   * @memberof module:utils/logger~Logger.LOG_LEVELS
   * @default  510
   */
  WARNING: 0xff << 1,

  /**
   * Error level logging. Used for critical errors that require immediate attention.
   *
   * @type     {number}
   * @memberof module:utils/logger~Logger.LOG_LEVELS
   * @default  255
   */
  ERROR: 0xff << 0
});

/**
 * The prefix for the info level message.
 * @type    {string}
 * @default <pre class=str>'[INFO]'</pre>
 * @since   1.0.0
 */
Logger.INFO_PREFIX = style([0, 'BC'], '[INFO]');

/**
 * The prefix for the done level message.
 * @type    {string}
 * @default <pre class=str>'[DONE]'</pre>
 * @since   1.0.0
 */
Logger.DONE_PREFIX = style([0, 'BG'], '[DONE]');

/**
 * The prefix for the debug level message.
 * @type    {string}
 * @default <pre class=str>'[DEBUG]'</pre>
 * @since   1.0.0
 */
Logger.DEBUG_PREFIX = style([0, '~', 'W'], '[DEBUG]');

/**
 * The prefix for the warning level message.
 * @type    {string}
 * @default <pre class=str>'[WARNING]'</pre>
 * @since   1.0.0
 */
Logger.WARNING_PREFIX = style([0, 'BY'], '[WARNING]');

/**
 * The prefix for the error level message.
 * @type    {string}
 * @default <pre class=str>'[ERROR]'</pre>
 * @since   1.0.0
 */
Logger.ERROR_PREFIX = style([0, 'BR'], '[ERROR]');

/**
 * Checks whether the given stream is a standard stream determined by its file descriptor.
 *
 * If the `fd` argument is not specified or it is not a number type, the function will checks whether
 * the given stream is either a standard output or standard error stream.
 *
 * The file descriptor must be a positive number and between range 1 and 2. These file descriptors are:
 *   - `1` is a standard output stream (`process.stdout`)
 *   - `2` is a standard error stream (`process.stderr`)
 *
 * @param {WritableStream} stream - The writable stream to check.
 * @param {number} [fd] - A positive number representing the file descriptor.
 * @returns {boolean} Returns `true` if the stream is a standard stream and its
 *                    file descriptor is equal to given expected file descriptor.
 *
 * @function
 * @package
 * @since    2.0.0
 */
Logger.isStdStream = function isStdStream(stream, fd) {
  if (!(stream instanceof Writable)) return false;

  const stdFds = [1, 2];
  const streamFd = stream.fd ?? -1;
  return stdFds.includes(streamFd) && (typeof fd === 'number' ? streamFd === fd : true);
};

/**
 * Removes all ANSI escape codes if the given stream is not TTY.
 *
 * @param {string} text - The text message to remove the ANSI codes if condition is met.
 * @param {WritableStream} stream - The writable stream to check whether it is support TTY.
 * @returns {string} - The original text message if the given stream is support TTY, otherwise a text
 *                     message with all ANSI escape codes are stripped.
 *
 * @function
 * @package
 * @since  2.0.0
 */
Logger.stripIfNotTTY = function stripIfNotTTY(text, stream) {
  stream = stream || process.stdout;
  return stream?.isTTY === true ? text : stripVTControlCharacters(text);
};


/**
 * Logs an **info** level message to the console, formatting it with a timestamp
 * and a predefined info prefix.
 *
 * The output format adapts based on the standard output stream width.
 *
 * - If the stream is closed, the function exits early and returns `false`.
 * - If the output stream is a TTY and its width is at least 75 columns,
 *   a timestamp is prefixed to the message.
 *
 * @param     {...string} [msg] - One or more message strings to log.
 * @returns   {boolean} `true` if the message was successfully written, `false` if the stream is closed.
 *
 * @function
 * @package
 * @since     1.0.0
 * @see       {@link module:utils/logger~LOG_LEVELS LOG_LEVELS}
 */
Logger.info = function info(...msg) {
  const stream = this.stdout || process.stdout;
  if (isStreamClosed(stream)) return false;  // Return early if the given stream is closed

  let prefix = style([0, '~'], `${customDateFormat(new Date())}::`);
  // NOTE: The `columns` property is defined in TTY mode only, so if it is undefined
  //       it can be considered the stream is piped or redirected to file.
  if ((stream.columns ?? 75) < 75) prefix = '';
  prefix += Logger.INFO_PREFIX + ' ';
  return stream.write(
    (NO_COLOR ? stripVTControlCharacters : Logger.stripIfNotTTY)(
      prefix + msg.join(' '), stream) + '\n');
};

/**
 * Logs an **info** level message to the console, formatting it with a timestamp
 * and a predefined done prefix.
 *
 * The output format adapts based on the standard output stream width.
 *
 * - If the stream is closed, the function exits early and returns `false`.
 * - If the output stream is a TTY and its width is at least 75 columns,
 *   a timestamp is prefixed to the message.
 *
 * @param     {...string} [msg] - One or more message strings to log.
 * @returns   {boolean} `true` if the message was successfully written, `false` if the stream is closed.
 *
 * @function
 * @package
 * @since     1.0.0
 * @see       {@link module:utils/logger~LOG_LEVELS LOG_LEVELS}
 */
Logger.done = function done(...msg) {
  const stream = this.stdout || process.stdout;
  if (isStreamClosed(stream)) return false;  // Return early if the given stream is closed

  let prefix = style([0, '~'], `${customDateFormat(new Date())}::`);
  // NOTE: The `columns` property is defined in TTY mode only, so if it is undefined
  //       it can be considered the stream is piped or redirected to file.
  if ((stream.columns ?? 75) < 75) prefix = '';
  prefix += Logger.DONE_PREFIX + ' ';
  return stream.write(
    (NO_COLOR ? stripVTControlCharacters : Logger.stripIfNotTTY)(
      prefix + msg.join(' '), stream) + '\n');
};

/**
 * Logs a **debug** level message to the console, formatting it with a timestamp
 * and a predefined done prefix.
 *
 * The output format adapts based on the standard output stream width.
 *
 * - If the stream is closed, the function exits early and returns `false`.
 * - If the output stream is a TTY and its width is at least 75 columns,
 *   a timestamp is prefixed to the message.
 *
 * @param     {...string} [msg] - One or more message strings to log.
 * @returns   {boolean} `true` if the message was successfully written, `false` if the stream is closed.
 *
 * @function
 * @package
 * @since     1.0.0
 * @see       {@link module:utils/logger~LOG_LEVELS LOG_LEVELS}
 */
Logger.debug = function debug(...msg) {
  const stream = this.stdout || process.stdout;
  if (isStreamClosed(stream)) return false;  // Return early if the given stream is closed

  let prefix = style([0, '~'], `${customDateFormat(new Date())}::`);
  // NOTE: The `columns` property is defined in TTY mode only, so if it is undefined
  //       it can be considered the stream is piped or redirected to file.
  if ((stream.columns ?? 75) < 75) prefix = '';
  prefix += Logger.DEBUG_PREFIX + ' ';
  return stream.write(
    (NO_COLOR ? stripVTControlCharacters : Logger.stripIfNotTTY)(
      prefix + msg.join(' '), stream) + '\n');
};

/**
 * Logs a **warning** level message to the console, formatting it with a timestamp
 * and a predefined done prefix.
 *
 * The output format adapts based on the standard output stream width.
 *
 * - If the stream is closed, the function exits early and returns `false`.
 * - If the output stream is a TTY and its width is at least 75 columns,
 *   a timestamp is prefixed to the message.
 *
 * @param     {...string} [msg] - One or more message strings to log.
 * @returns   {boolean} `true` if the message was successfully written, `false` if the stream is closed.
 *
 * @function
 * @package
 * @since     1.0.0
 * @see       {@link module:utils/logger~LOG_LEVELS LOG_LEVELS}
 */
Logger.warn = function warn(...msg) {
  const stream = this.stderr || process.stderr;
  if (isStreamClosed(stream)) return false;  // Return early if the given stream is closed

  let prefix = style([0, '~'], `${customDateFormat(new Date())}::`);
  // NOTE: The `columns` property is defined in TTY mode only, so if it is undefined
  //       it can be considered the stream is piped or redirected to file.
  if ((stream.columns ?? 75) < 75) prefix = '';
  prefix += Logger.WARNING_PREFIX + ' ';
  return stream.write(
    (NO_COLOR ? stripVTControlCharacters : Logger.stripIfNotTTY)(
      prefix + msg.join(' '), stream) + '\n');
};

/**
 * Logs an **error** level message to the console, formatting it with a timestamp
 * and a predefined done prefix.
 *
 * The output format adapts based on the standard output stream width.
 *
 * - If the stream is closed, the function exits early and returns `false`.
 * - If the output stream is a TTY and its width is at least 75 columns,
 *   a timestamp is prefixed to the message.
 *
 * @param     {...string} [msg] - One or more message strings to log.
 * @returns   {boolean} `true` if the message was successfully written, `false` if the stream is closed.
 *
 * @function
 * @package
 * @since     1.0.0
 * @see       {@link module:utils/logger~LOG_LEVELS LOG_LEVELS}
 */
Logger.error = function error(...msg) {
  const stream = this.stderr || process.stderr;
  if (isStreamClosed(stream)) return false;  // Return early if the given stream is closed

  let prefix = style([0, '~'], `${customDateFormat(new Date())}::`);
  // NOTE: The `columns` property is defined in TTY mode only, so if it is undefined
  //       it can be considered the stream is piped or redirected to file.
  if ((stream.columns ?? 75) < 75) prefix = '';
  prefix += Logger.ERROR_PREFIX + ' ';
  return stream.write(
    (NO_COLOR ? stripVTControlCharacters : Logger.stripIfNotTTY)(
      prefix + msg.join(' '), stream) + '\n');
};

/**
 * Writes a line with customizable width to specific log stream.
 *
 * If the provided writable stream is representing a file (instead of a TTY), the
 * `width` argument will be ignored and will default to `80`.
 *
 * @param   {number} [width=80] - A number representating the line's width. If not specified,
 *                                then it will adjusts automatically with the provided stream's width
 *                                if have `columns` property.
 * @param   {WritableStream} [stream=process.stdout] - The writable stream to write the line.
 *                                                     Defaults to `process.stdout` if not specified.
 * @returns {boolean} `true` if the line was successfully written, `false` if the stream is closed.
 *
 * @function
 * @package
 * @since    2.0.0
 */
Logger.line = function line(width, stream) {
  stream = stream instanceof Writable ? stream : (this.stdout || process.stdout);
  const hasColumns = typeof stream?.columns === 'number' && stream.columns > 0;
  const len = hasColumns ? stream.columns : (typeof width === 'number' ? width : 82);
  return stream.write('-'.repeat(len / 1.5) + '\n');
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
 * @param {string | WritableStream} [prefix] - Optional prefix for the log message. If not provided, it is auto-generated.
 *                                             If a writable stream is given, it will treated as `stream` argument.
 * @param {WritableStream} [stream] - The writable stream where the message should be written.
 *                                    Defaults to `process.stdout` if not specified.
 *
 * @returns {boolean} `true` if the message was successfully written, `false` if the stream is closed.
 *
 * @throws {InvalidTypeError} If both the `prefix` and `stream` argument are specified as writable stream.
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
    ? (this.stdout || process.stdout)  // Use standard output as fallback
    : stream;

  if (stream.closed) {
    Logger.error('Stream is closed, cannot write log');
    throw new Error('Stream is closed, cannot write log');
  }

  if (prefix ?? false) {
    isTTY = stream.isTTY === true;
    if ((stream.columns ?? 75) >= 75) {
      prefix = style([0, '~'], `${customDateFormat(new Date())}::`);
    }

    prefix += Logger.INFO_PREFIX;
  }

  // Concat the message and strip ANSI escape codes if not TTY
  msg = (NO_COLOR
    ? stripVTControlCharacters
    : Logger.stripIfNotTTY)(`${prefix ? prefix + ' ' : ''}${msg}`, stream);
  return stream.write(msg);  // Attempt to write into stream
};


/**
 * Creates a logger with a specified log level and optional output streams.
 *
 * The logger instance provides logging methods (`info`, `done`, `debug`, `warn`, and `error`),
 * which are selectively disabled based on the provided log level. Additionally, the logger has
 * immutable properties to store the current log level and output streams.
 *
 * #### Log Level Behavior
 * - `NONE`: Disables all logging methods.
 * - `INFO`: Disables `debug` logging.
 * - `WARNING`: Disables `debug`, `info`, and `done` logging.
 * - `ERROR`: Disables `debug`, `info`, `done`, and `warn` logging.
 *
 * #### Immutable Properties
 * - `level` (string): The assigned log level (e.g., `'INFO'`, `'WARNING'`).
 * - `stdout` (WritableStream): The output stream for non-error logs.
 * - `stderr` (WritableStream): The output stream for error logs.
 *
 * @param {string | number} [logLevel] - The log level, either a string key (e.g., `'INFO'`)
 *                                       or a numeric value from `LOG_LEVELS`. Defaults to `LOG_LEVELS.INFO`
 *                                       if an invalid value is provided.
 * @param {object} [options] - Configuration options for logging output streams.
 * @param {WritableStream} [options.stdout] - Stream for standard output. Defaults to `process.stdout`.
 * @param {WritableStream} [options.stderr] - Stream for error output. Defaults to `process.stderr`.
 * @returns {module:utils/logger~Logger} A logger object with log methods disabled according to the specified log level.
 *                                       It also contains immutable properties (`level`, `stdout`, and `stderr`).
 *
 * @throws {InvalidTypeError} If `stdout` or `stderr` is not a writable stream.
 *
 * @example
 * const logger = createLogger(LOG_LEVELS.WARNING);
 * logger.info('This will not be logged');  // Disabled at WARNING level
 * logger.warn('This will be logged');      // Enabled at WARNING level
 * console.log(logger.level);  // => 'WARNING'
 *
 * @function
 * @package
 * @since   2.0.0
 * @see     {@link module:utils/logger~Logger Logger}
 * @see     {@link module:utils/logger~Logger.LOG_LEVELS Logger.LOG_LEVELS}
 */
Logger.createLogger = function createLogger(logLevel, options) {
  logLevel = (Object.keys(Logger.LOG_LEVELS).includes(logLevel)
      || Object.values(Logger.LOG_LEVELS).includes(logLevel))
    ? (typeof logLevel === 'string' ? Logger.LOG_LEVELS[logLevel] : logLevel)
    : Logger.LOG_LEVELS.INFO;

  options = typeof options === 'object'
    ? options
    : { stdout: process.stdout, stderr: process.stderr };

  let notStream;
  if (!(options.stdout instanceof Writable)) notStream = 'stdout';
  else if (!(options.stderr instanceof Writable)) notStream = 'stderr';

  // Throw an error if one of streams is not a writable stream
  if (notStream) {
    throw new InvalidTypeError(`Stream for ${notStream} is not a writable stream`, {
      actualType: TypeUtils.getType(options[notStream]),
      expectedType: 'WritableStream<any>'
    });
  }

  const { NONE, INFO, WARNING, ERROR } = Logger.LOG_LEVELS;
  const logger = { ...Logger };  // NOTE: It is better to deep copy the Logger object

  delete logger.createLogger;  // Self-delete
  delete logger.log;           // Delete ref #1
  delete logger.logger;        // Delete ref #2

  // Attributes for immutable property, but allow enumeration
  const propertyAttrs = {
    writable: false,
    configurable: false,
    enumerable: true
  };

  // These properties are immutable and cannot be updated after creation
  Object.defineProperties(logger, {
    stdout: {
      value: options.stdout,
      ...propertyAttrs
    },
    stderr: {
      value: options.stderr,
      ...propertyAttrs
    },
    // Add a property to determine the current log level
    level: {
      value: Object.keys(Logger.LOG_LEVELS)[
        Object.values(Logger.LOG_LEVELS).indexOf(logLevel)],
      ...propertyAttrs
    }
  });

  if (logLevel === NONE) {
    return ['info', 'done', 'debug', 'warn', 'error', 'line'].reduce((acc, val) => {
      // NOTE: Reassign with an empty function, but do not change the arguments
      acc[val] = (..._args) => { };
      return acc;
    }, logger);
  }

  const logFuncs = [];
  if (logLevel <= INFO) logFuncs.push('debug');
  if (logLevel <= WARNING) logFuncs.push('info', 'done');
  if (logLevel <= ERROR) logFuncs.push('warn');
  logFuncs.forEach(func => logger[func] = (..._args) => { });
  return logger;
};


Logger.log = Logger;     // Circular reference #1 (new alias)
Logger.logger = Logger;  // Circular reference #2 (for backward compatibility)

// Export the `Logger` object with the circular references
module.exports = Logger;
