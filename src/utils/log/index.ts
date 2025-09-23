/**
 * Utility submodule for logging process.
 *
 * @module    utils/log
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import { TypeUtils } from '#/vendor/type-utils.js';
import { InvalidTypeError } from '#error';
import { isWritableStream } from '#utils/stream.js';
import { type ConsoleStreamLike } from '#utils/terminal.js';
import {
  NO_PREFIX_WIDTH,
  type CreateLoggerOptions,
  customDateFormat,
  createPrefix,
  LogLevel,
  Logger,
  LoggerConstructor,
  Logger$Debug,
  Logger$Info,
  Logger$Warning,
  Logger$Error,
  Logger$None
} from './logger.js';

export {
  NO_PREFIX_WIDTH,
  CreateLoggerOptions,
  createPrefix,
  customDateFormat,
  LogLevel,
  Logger,
  LoggerConstructor,
  Logger$Debug,
  Logger$Info,
  Logger$Warning,
  Logger$Error,
  Logger$None
};


/**
 * Creates a new logger instance configured to a specific log level.
 *
 * This factory function provides a convenient and type-safe way to
 * obtain a logger. When a literal {@linkcode LogLevel} enum member is
 * provided, TypeScript's inference allows for a more specific
 * logger class to be returned.
 *
 * @remarks
 * If `stdout` or `stderr` options are not provided, `process.stdout`
 * and `process.stderr` will be used as defaults respectively.
 * Runtime validation ensures that provided streams are indeed writable.
 *
 * @param level - The desired log level for the new logger.
 *                Can be a numeric {@linkcode LogLevel} value (e.g., `LogLevel.INFO`)
 *                or its string key (e.g., `'INFO'`).
 * @param options - Optional configuration for the logger streams.
 * @returns A new logger instance, typed specifically based on the provided `level`.
 *
 * @throws {@link InvalidTypeError} If the provided `stdout` or `stderr` is not a writable stream.
 *
 * @example
 * ```ts
 * // Get a logger that only shows errors
 * const errorLogger = createLogger(LogLevel.ERROR);
 * errorLogger.error('An error occurred!'); // Logs
 * errorLogger.info('Informational message'); // Does not log
 * ```
 *
 * @example
 * ```ts
 * // Get a logger that shows debug messages, with custom streams
 * import { createWriteStream } from 'fs';
 * const debugFileStream = createWriteStream('debug.log');
 * const myDebugLogger = createLogger('DEBUG', {
 *   stdout: debugFileStream,
 *   stderr: debugFileStream
 * });
 * myDebugLogger.debug('Writing debug to file!'); // Logs to file
 * ```
 *
 * @public
 * @since 5.0.0
 */
export function createLogger(level: LogLevel.DEBUG | 'DEBUG', options?: CreateLoggerOptions): Logger$Debug;
export function createLogger(level: LogLevel.INFO | 'INFO', options?: CreateLoggerOptions): Logger$Info;
export function createLogger(level: LogLevel.WARNING | 'WARNING', options?: CreateLoggerOptions): Logger$Warning;
export function createLogger(level: LogLevel.ERROR | 'ERROR', options?: CreateLoggerOptions): Logger$Error;
export function createLogger(level: LogLevel.NONE | 'NONE', options?: CreateLoggerOptions): Logger$None;
export function createLogger<L extends keyof typeof LogLevel>(level: LogLevel | L, options?: CreateLoggerOptions): Logger;
export function createLogger<L extends keyof typeof LogLevel>(level: LogLevel | L, options?: CreateLoggerOptions): Logger {
  const stdout = options?.stdout ?? process.stdout as ConsoleStreamLike;
  const stderr = options?.stderr ?? process.stderr;
  const lvl = typeof level === 'string' ? LogLevel[level] : level;

  if (!isWritableStream(stdout)) {
    throw new InvalidTypeError('Given stdout is not a writable stream', {
      actualType: TypeUtils.getType(stdout),
      expectedType: '[WritableStream]'
    });
  }
  if (!isWritableStream(stderr)) {
    throw new InvalidTypeError('Given stderr is not a writable stream', {
      actualType: TypeUtils.getType(stderr),
      expectedType: '[WritableStream]'
    });
  }

  switch (lvl) {
    // The arguments need to be cast to the correct type first
    case LogLevel.DEBUG: return new Logger$Debug(stdout as ConsoleStreamLike, stderr as ConsoleStreamLike);
    case LogLevel.INFO: return new Logger$Info(stdout as ConsoleStreamLike, stderr as ConsoleStreamLike);
    case LogLevel.WARNING: return new Logger$Warning(stdout as ConsoleStreamLike, stderr as ConsoleStreamLike);
    case LogLevel.ERROR: return new Logger$Error(stdout as ConsoleStreamLike, stderr as ConsoleStreamLike);
    case LogLevel.NONE: return new Logger$None(stdout as ConsoleStreamLike, stderr as ConsoleStreamLike);
    default: return new Logger$None(stdout as ConsoleStreamLike, stderr as ConsoleStreamLike);
  }
}

/**
 * A default logger instance configured to output at the {@link LogLevel.INFO | INFO} level.
 *
 * @public
 * @since 5.0.0
 */
export const DefaultLogger = createLogger(LogLevel.INFO);

/**
 * A logger that does not output any messages.
 *
 * @public
 * @since 5.0.0
 */
export const NoneLogger = createLogger(LogLevel.NONE);
