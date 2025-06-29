/**
 * Utility submodule that provides a logger implementation for the **YTMP3-JS** library.
 *
 * @module    utils/log/logger
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import { stripVTControlCharacters } from 'node:util';
import { Writable } from 'node:stream';
import { WriteStream as TTYWriteStream } from 'node:tty';
import { style } from '#colors';
import { TerminalFormatter as Terminal, type ConsoleStreamLike } from '#utils/terminal';
import { isWriteSafe, isStreamClosed, isTTYStream } from '#utils/stream';
import { InvalidTypeError } from '#error';
import { useNoColor } from '#runtime/env';

const NO_COLOR = useNoColor();


/**
 * The minimum width of the console to display the prefix.
 *
 * If the console width is less than this value, the logger will not use prefix.
 * @internal
 * @since 5.0.0
 */
export const NO_PREFIX_WIDTH = 80;

/**
 * Options for configuring a new logger instance.
 * @public
 * @since 5.0.0
 */
export interface CreateLoggerOptions {
  /**
   * An optional writable stream to use for standard output messages (e.g., `INFO`, `DEBUG`).
   * Defaults to {@link https://nodejs.org/api/process.html#processstdout | `process.stdout`} if not provided.
   */
  stdout?: ConsoleStreamLike;
  /**
   * An optional writable stream to use for standard error messages (e.g., `WARNING`, `ERROR`).
   * Defaults to {@link https://nodejs.org/api/process.html#processstderr | `process.stderr`} if not provided.
   */
  stderr?: ConsoleStreamLike;
}

/**
 * Creates a custom date string from the given `Date` object.
 *
 * This function returns a string in the format `"[HH:MM:SS.mmm]"`, where:
 *
 * - `HH` is the hour in 24-hour format,
 * - `MM` is the minute,
 * - `SS` is the second,
 * - `mmm` is the millisecond.
 *
 * The returned string is colored with a dark gray color using ANSI escape codes
 * if `colors` is `true` (default). Otherwise, the returned string is plain text.
 *
 * @param date - The `Date` object to format.
 * @param colors - Whether to use color codes in the returned string (default: `true`).
 * @returns The formatted date string.
 *
 * @internal
 * @since 5.0.0
 */
export function customDateFormat(date: Date, colors = true): string {
  const time = date.toLocaleTimeString('en-US', { hour12: false });
  const millis = `${date.getMilliseconds()}`.padStart(3, '0');

  return colors
    ? style('~', `[${style([0, 'M'], `${time}.${millis}`)}`) + style('~', ']')
    : `[${time}.${millis}]`;
}


/**
 * Creates a log prefix string from the given `prefix` string.
 *
 * If `colors` is `true` (default), the returned string is colored with a dark gray
 * color using ANSI escape codes. Otherwise, the returned string is plain text.
 *
 * The returned string is in the format `HH:MM:SS.mmm :: PREFIX`, where:
 *
 * - `HH` is the hour in 24-hour format,
 * - `MM` is the minute,
 * - `SS` is the second,
 * - `mmm` is the millisecond, and
 * - `PREFIX` is the given `prefix` string.
 *
 * @param prefix - The string to use as the log prefix.
 * @param colors - Whether to use color codes in the returned string (default: `true`).
 * @returns The formatted log prefix string.
 *
 * @internal
 * @since 5.0.0
 */
export function createPrefix(prefix: string, colors = true): string {
  return colors
    ? `${customDateFormat(new Date())}` + style('~', `::`) + prefix
    : stripVTControlCharacters(`${customDateFormat(new Date())}::${prefix}`);
}

/**
 * Enum constant representing log levels.
 *
 * This enum defines a set of predefined log levels, each assigned a unique
 * numeric value derived from bitwise shifts. The design enables a
 * **threshold-based logging system**, where a logger configured with a
 * specific level will process messages at that level and all levels
 * considered "more severe" (i.e., having a numerically smaller value in this enum).
 *
 * The hierarchy from least to most severe is:  
 * `DEBUG (2040) > INFO (1020) > WARNING (510) > ERROR (255)`  
 * `NONE (0)` explicitly disables all logging.
 *
 * @public
 * @since 5.0.0
 */
export enum LogLevel {
  /** Represents no logging level. Used to disable logging. */
  // eslint-disable-next-line @typescript-eslint/prefer-literal-enum-member
  NONE    = 0x00 << 4,  //* === 0
  /** Debug level logging. Used for detailed debugging information. */
  // eslint-disable-next-line @typescript-eslint/prefer-literal-enum-member
  DEBUG   = 0xFF << 3,  //* === 2040 (binary: 111111111000)
  /** Informational level logging. Used for general operational messages. */
  // eslint-disable-next-line @typescript-eslint/prefer-literal-enum-member
  INFO    = 0xFF << 2,  //* === 1020 (binary: 1111111100)
  /** Warning level logging. Used for non-critical issues that need attention. */
  // eslint-disable-next-line @typescript-eslint/prefer-literal-enum-member
  WARNING = 0xFF << 1,  //* === 510 (binary: 111111110)
  /** Error level logging. Used for critical errors that require immediate attention. */
  // eslint-disable-next-line @typescript-eslint/prefer-literal-enum-member
  ERROR   = 0xFF << 0,  //* === 255 (binary: 11111111)
}


/**
 * Defines the public interface for all logger instances.
 *
 * This interface specifies the methods and properties that any logger
 * implementation must expose, ensuring consistent usage across different
 * logger configurations.
 *
 * @public
 * @since 5.0.0
 */
export interface Logger {
  /** The prefix for the info level message. */
  readonly INFO_PREFIX: string;
  /** The prefix for the done level message. */
  readonly DONE_PREFIX: string;
  /** The prefix for the debug level message. */
  readonly DEBUG_PREFIX: string;
  /** The prefix for the warning level message. */
  readonly WARNING_PREFIX: string;
  /** The prefix for the error level message. */
  readonly ERROR_PREFIX: string;

  /** A writable stream to use for standard output */
  readonly stdout: ConsoleStreamLike;
  /** A writable stream to use for standard error */
  readonly stderr: ConsoleStreamLike;
  /**
   * The current log level for this logger instance.
   *
   * Messages with a severity lower than this level will not be logged.
   *
   * @remarks
   * This stores the numeric value from the {@link LogLevel} enum.
   * For the string version, use {@linkcode levelStr} instead.
   * @see {@linkcode levelStr}
   */
  readonly level: LogLevel;
  /**
   * The current log level for this logger instance, represented as a string.
   *
   * Messages with a severity lower than this level will not be logged.
   * @see {@linkcode level}
   */
  readonly levelStr: keyof typeof LogLevel;

  /**
   * Logs an **info** level message to the standard output.
   *
   * @param msg - One or more message strings to concatenate and log.
   * @returns `true` if the message was successfully written to the stream, `false` otherwise.
   */
  info(...msg: string[]): boolean;
  /**
   * Logs a **done** level message to the standard output.
   *
   * This is typically used for successful completion messages,
   * often treated similar to info level for logging purposes.
   *
   * @param msg - One or more message strings to concatenate and log.
   * @returns `true` if the message was successfully written to the stream, `false` otherwise.
   */
  done(...msg: string[]): boolean;
  /**
   * Logs a **debug** level message to the standard output.
   *
   * @param msg - One or more message strings to concatenate and log.
   * @returns `true` if the message was successfully written to the stream, `false` otherwise.
   */
  debug(...msg: string[]): boolean;
  /**
   * Logs a **warning** level message to the standard error.
   *
   * @param msg - One or more message strings to concatenate and log.
   * @returns `true` if the message was successfully written to the stream, `false` otherwise.
   */
  warn(...msg: string[]): boolean;
  /**
   * Logs an **error** level message to the standard error.
   *
   * @param msg - One or more message strings to concatenate and log.
   * @returns `true` if the message was successfully written to the stream, `false` otherwise.
   */
  error(...msg: string[]): boolean;
  /**
   * Logs a message to the specified stream with prefix based on the current log level.
   *
   * @remarks
   * This method does not bind to any specific logging level, which makes it suitable for
   * writing custom messages at any level.
   *
   * @param msg - One or more message strings to concatenate and log.
   * @param stream - The stream to write the message to (e.g., `stdout`, `stderr`).
   * @returns `true` if the message was successfully written to the stream, `false` otherwise.
   */
  write(msg: string, stream?: ConsoleStreamLike): boolean;
  /**
   * Logs a message to the specified stream with the specified prefix.
   *
   * @remarks
   * This method does not bind to any specific logging level, which makes it suitable for
   * writing custom messages at any level.
   *
   * @param msg - One or more message strings to concatenate and log.
   * @param prefix - The prefix string to prepend to the message (e.g., `[INFO]`).
   * @param stream - The stream to write the message to (e.g., `stdout`, `stderr`).
   * @returns `true` if the message was successfully written to the stream, `false` otherwise.
   */
  write(msg: string, prefix?: string | null, stream?: ConsoleStreamLike): boolean;
  /**
   * Logs a message to the specified stream with the specified prefix.
   *
   * @remarks
   * This method does not bind to any specific logging level, which makes it suitable for
   * writing custom messages at any level.
   *
   * @param msg - One or more message strings to concatenate and log.
   * @param prefix - The prefix string to prepend to the message (e.g., `[INFO]`) or the stream.
   * @param stream - The stream to write the message to (e.g., `stdout`, `stderr`).
   * @returns `true` if the message was successfully written to the stream, `false` otherwise.
   */
  write(msg: string, prefix: string | ConsoleStreamLike | null | undefined, stream?: ConsoleStreamLike): boolean;
  /**
   * Logs a horizontal line to the specified stream.
   *
   * If the `width` parameter is unspecified, the default width will use the terminal width.
   * If the terminal is not TTY, the default width will be 80 characters.
   *
   * @param width - The width of the line (default: terminal width).
   * @param prefix - The prefix string to prepend before the line (default: ${@linkcode INFO_PREFIX}).
   * @param stream - The stream to write the line to (default: `this.stdout`).
   */
  line(width?: number | null, prefix?: string | null, stream?: ConsoleStreamLike): boolean;
}

/**
 * The base class for all logger instances, providing the core logging
 * functionality and level-based filtering.
 *
 * This class implements the {@link Logger} interface and handles
 * the logic for writing messages to streams, applying prefixes,
 * and determining whether a message should be logged based on
 * the logger's configured level.
 *
 * @public
 * @since 5.0.0
 */
export class LoggerConstructor implements Logger {
  /** @inheritdoc */
  readonly INFO_PREFIX    = style([0, 'BC'], '[INFO]');
  /** @inheritdoc */
  readonly DONE_PREFIX    = style([0, 'BG'], '[DONE]');
  /** @inheritdoc */
  readonly DEBUG_PREFIX   = style([0, '~', 'W'], '[DEBUG]');
  /** @inheritdoc */
  readonly WARNING_PREFIX = style([0, 'BY'], '[WARNING]');
  /** @inheritdoc */
  readonly ERROR_PREFIX   = style([0, 'BR'], '[ERROR]');

  /** @inheritdoc */
  readonly stdout: ConsoleStreamLike;
  /** @inheritdoc */
  readonly stderr: ConsoleStreamLike;
  /** @inheritdoc */
  readonly level: LogLevel;
  /** @inheritdoc */
  readonly levelStr: keyof typeof LogLevel;

  /**
   * Creates an instance of LoggerConstructor.
   *
   * @param level - The initial log level for this logger. Can be a numeric `LogLevel` value
   *                (e.g., `LogLevel.INFO`) or a string key of the enum (e.g., `'INFO'`).
   * @param stdout - The writable stream to use for standard output messages.
   * @param stderr - The writable stream to use for standard error messages.
   */
  constructor(
    level: LogLevel | keyof typeof LogLevel,
    stdout: ConsoleStreamLike,
    stderr: ConsoleStreamLike
  ) {
    const lvl = typeof level === 'string' ? LogLevel[level] : level;
    this.level = lvl;
    this.levelStr = Object.keys(LogLevel)[Object.values(LogLevel).indexOf(lvl)] as keyof typeof LogLevel;
    this.stdout = stdout;
    this.stderr = stderr;
  }

  /**
   * Determines if a message of a given level should be logged by this logger instance.
   *
   * This method uses a threshold comparison based on the numeric values of {@linkcode LogLevel}.
   * A message is logged if its `messageLevel` (severity) is less than or equal to
   * the logger's `this.level`. In this system, smaller numeric values represent higher severity.
   *
   * @protected
   * @param messageLevel - The log level of the message being considered for logging.
   * @returns `true` if the message should be logged, `false` otherwise.
   */
  protected _shouldLog(msgLevel: LogLevel): boolean {
    // If level is set to NONE, never log anything
    if (this.level === LogLevel.NONE) return false;
    // For other levels, log if the message level is less than or equal to the logger's set level.
    return this.level >= msgLevel;
  }

  /**
   * Internal utility to write a log message to the specified stream,
   * applying formatting and prefixes.
   *
   * @private
   * @param stream - The stream to write the message to (e.g., `stdout`, `stderr`).
   * @param msg - An array of message strings to concatenate.
   * @param prefix - The prefix string to prepend to the message (e.g., `[INFO]`).
   * @param addNewLine - Whether to add a new line after the message (default: `true`).
   * @returns `true` if the message was successfully written, `false` if the stream is closed.
   */
  private __writeLog(stream: ConsoleStreamLike, msg: string[], prefix?: string, addNewLine = true): boolean {
    if (isStreamClosed(stream)) return false;  // Return early if the given stream is closed
    if (!isWriteSafe(stream)) return false;  // If is unsafe to write, never write anything

    let _prefix: string; // = style([0, '~'], `${customDateFormat(new Date(), true)}::`);
    // NOTE: The `columns` property is defined in TTY mode only, so if it is undefined
    //       it can be considered the stream is piped or redirected to file.
    if (isTTYStream(stream) && ((stream.columns ?? NO_PREFIX_WIDTH) < NO_PREFIX_WIDTH)) {
      _prefix = '';
    } else {
      _prefix = prefix ? (createPrefix(prefix, true) + ' ') : '';
    }

    return stream.write(
      (NO_COLOR ? stripVTControlCharacters : Terminal.stripANSI)(
        _prefix + msg.join(' ') + (addNewLine ? '\n' : ''), stream));
  }

  /** @inheritdoc */
  public info(...msg: string[]): boolean {
    if (!this._shouldLog(LogLevel.INFO)) return false;
    return this.__writeLog(this.stdout || process.stdout, msg, this.INFO_PREFIX);
  }

  /** @inheritdoc */
  public done(...msg: string[]): boolean {
    if (!this._shouldLog(LogLevel.INFO)) return false;
    return this.__writeLog(this.stdout || process.stdout, msg, this.DONE_PREFIX);
  }

  /** @inheritdoc */
  public debug(...msg: string[]): boolean {
    if (!this._shouldLog(LogLevel.DEBUG)) return false;
    return this.__writeLog(this.stdout || process.stdout, msg, this.DEBUG_PREFIX);
  }

  /** @inheritdoc */
  public warn(...msg: string[]): boolean {
    if (!this._shouldLog(LogLevel.WARNING)) return false;
    return this.__writeLog(this.stderr || process.stderr, msg, this.WARNING_PREFIX);
  }

  /** @inheritdoc */
  public error(...msg: string[]): boolean {
    if (!this._shouldLog(LogLevel.ERROR)) return false;
    return this.__writeLog(this.stderr || process.stderr, msg, this.ERROR_PREFIX);
  }

  /** @inheritdoc */
  public write(msg: string, stream?: ConsoleStreamLike): boolean;
  /** @inheritdoc */
  public write(msg: string, prefix?: string | null, stream?: ConsoleStreamLike): boolean;
  /** @inheritdoc */
  public write(msg: string, prefix: string | ConsoleStreamLike | null | undefined, stream?: ConsoleStreamLike): boolean {
    if (prefix instanceof Writable && stream === undefined) {
      stream = prefix;
      prefix = undefined;
    } else if (prefix instanceof Writable && stream instanceof Writable) {
      throw new InvalidTypeError(
        "Invalid type for 'prefix' argument. Did you mean to pass `WritableStream`?"
      );
    }

    stream = !(stream && (stream instanceof Writable))
      ? (this.stdout || process.stdout)  // Use standard output as fallback
      : stream;

    if (stream.closed) {
      this.__writeLog(process.stderr, ['Stream is closed, cannot write log'], this.ERROR_PREFIX);
      throw new Error('Stream is closed, cannot write log');
    }

    if (prefix === undefined || prefix === '') {
      // If no prefix is provided, generate a default one
      if (stream instanceof TTYWriteStream && (stream.columns ?? NO_PREFIX_WIDTH) >= NO_PREFIX_WIDTH) {
        prefix = style([0, '~'], `${customDateFormat(new Date())}::`);
      }

      switch (this.level) {
        case LogLevel.DEBUG: prefix += this.DEBUG_PREFIX; break;
        case LogLevel.INFO: prefix += this.INFO_PREFIX; break;
        case LogLevel.WARNING: prefix += this.WARNING_PREFIX; break;
        case LogLevel.ERROR: prefix += this.ERROR_PREFIX; break;
        // Fallback to INFO prefix
        default: prefix += this.INFO_PREFIX;
      }
    }

    // Concat the message and strip ANSI escape codes if not TTY
    msg = (NO_COLOR
      ? stripVTControlCharacters
      : Terminal.stripANSI)(`${prefix ? (prefix + ' ') : ''}${msg}`, stream);
    return stream.write(msg);  // Attempt to write into stream
  }

  /** @inheritdoc */
  public line(width?: number | null, prefix?: string | null, stream?: ConsoleStreamLike): boolean {
    prefix = prefix || this.INFO_PREFIX;
    stream = stream ?? this.stdout;
    const prefixLen = Terminal.stripANSI(prefix, stream).length;
    const usedWidth = width ?? stream.isTTY ? ((stream as TTYWriteStream).columns - prefixLen * 2) : 80;
    const msg = style('C', new Array(usedWidth).fill('-').join(''));
    return this.__writeLog(stream, [msg], prefix, true);
  }
}

// #region Level-Specific Logger

/**
 * A specialized logger class configured to operate at the {@link LogLevel.DEBUG | DEBUG} level by default.
 * This logger will output messages at DEBUG, INFO, WARNING, and ERROR levels.
 *
 * @public
 * @extends LoggerConstructor
 * @since 5.0.0
 */
export class Logger$Debug extends LoggerConstructor implements Logger {
  /**
   * Creates an instance of this class.
   * @param stdout - The writable stream for standard output.
   * @param stderr - The writable stream for standard error.
   */
  constructor(stdout: ConsoleStreamLike, stderr: ConsoleStreamLike) {
    super(LogLevel.DEBUG, stdout, stderr);
  }
}

/**
 * A specialized logger class configured to operate at the {@link LogLevel.INFO | INFO} level by default.
 * This logger will output messages at INFO, WARNING, and ERROR levels, but will suppress DEBUG messages.
 *
 * @public
 * @extends LoggerConstructor
 * @since 5.0.0
 */
export class Logger$Info extends LoggerConstructor implements Logger {
  /**
   * Creates an instance of this class.
   * @param stdout - The writable stream for standard output.
   * @param stderr - The writable stream for standard error.
   */
  constructor(stdout: ConsoleStreamLike, stderr: ConsoleStreamLike) {
    super(LogLevel.INFO, stdout, stderr);
  }
}

/**
 * A specialized logger class configured to operate at the {@link LogLevel.WARNING | WARNING} level by default.
 * This logger will output messages at WARNING and ERROR levels, but will suppress INFO and DEBUG messages.
 *
 * @public
 * @extends LoggerConstructor
 * @since 5.0.0
 */
export class Logger$Warning extends LoggerConstructor implements Logger {
  /**
   * Creates an instance of this class.
   * @param stdout - The writable stream for standard output.
   * @param stderr - The writable stream for standard error.
   */
  constructor(stdout: ConsoleStreamLike, stderr: ConsoleStreamLike) {
    super(LogLevel.WARNING, stdout, stderr);
  }
}

/**
 * A specialized logger class configured to operate at the {@link LogLevel.ERROR | ERROR} level by default.
 * This logger will output only ERROR messages, suppressing WARNING, INFO, and DEBUG messages.
 *
 * @public
 * @extends LoggerConstructor
 * @since 5.0.0
 */
export class Logger$Error extends LoggerConstructor implements Logger {
  /**
   * Creates an instance of this class.
   * @param stdout - The writable stream for standard output.
   * @param stderr - The writable stream for standard error.
   */
  constructor(stdout: ConsoleStreamLike, stderr: ConsoleStreamLike) {
    super(LogLevel.ERROR, stdout, stderr);
  }
}

/**
 * A specialized logger class configured to operate at the {@link LogLevel.NONE | NONE} level by default.
 * This logger will suppress all logging output (DEBUG, INFO, WARNING, ERROR).
 *
 * @public
 * @extends LoggerConstructor
 * @since 5.0.0
 */
export class Logger$None extends LoggerConstructor implements Logger {
  /**
   * Creates an instance of this class.
   * @param stdout - The writable stream for standard output.
   * @param stderr - The writable stream for standard error.
   */
  constructor(stdout: ConsoleStreamLike, stderr: ConsoleStreamLike) {
    super(LogLevel.NONE, stdout, stderr);
  }
}

// #endregion Level-Specific Logger
