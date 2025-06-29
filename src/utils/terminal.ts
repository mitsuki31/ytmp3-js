/**
 * @module    utils/terminal
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import { Writable } from 'node:stream';
import { type WriteStream as FSWriteStream } from 'node:fs';
import { WriteStream as TTYWriteStream } from 'node:tty';
import { stripVTControlCharacters } from 'node:util';
import { TypeUtils } from '#/vendor/type-utils';
import type { NoParamFunction } from '#/types/utils';


/**
 * Represents a console-like writable stream.
 *
 * This type is a combination of `NodeJS.WriteStream` and `NodeJS.WritableStream` with an optional `fd` property.
 *
 * @since 5.0.0
 */
export type ConsoleStreamLike = (FSWriteStream | TTYWriteStream) & { fd?: number, isTTY?: boolean };

export
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class TerminalFormatter {
  /**
   * Core implementation for checking if a stream is a standard I/O stream.
   * This method is for internal use by the public-facing static methods.
   *
   * @param stream - The stream object to check.
   * @param fd - An optional file descriptor to check for an exact match.
   * @returns `true` if the stream's fd matches the criteria, otherwise `false`.
   *
   * @private
   * @since 5.0.0
   */
  private static _isStdStreamImpl(
    stream: ConsoleStreamLike,
    fd?: number
  ): boolean {
    // A basic check to ensure we're dealing with a stream object.
    if (!(stream instanceof Writable)) return false;

    const stdFds = [1, 2]; // File descriptors for stdout and stderr
    const streamFd = (stream as ConsoleStreamLike).fd ?? -1;

    // If a specific `fd` is provided, check for an exact match.
    if (typeof fd === 'number') return streamFd === fd;

    // Otherwise, check if the stream's fd is one of the standard fds.
    return stdFds.includes(streamFd);
  }

  /**
   * Checks if a given stream is a standard I/O stream (stdout or stderr).
   *
   * @remarks
   * This method identifies the stream by its file descriptor (`fd`). Standard output
   * has `fd: 1` and standard error has `fd: 2`. The overloads provide powerful
   * type inference for known stream types.
   *
   * @example
   * ```ts
   * import { TerminalFormatter } from './TerminalFormatter';
   * import { Writable } from 'stream';
   *
   * console.log(TerminalFormatter.isStdStream(process.stdout)); // true
   * console.log(TerminalFormatter.isStdStream(process.stderr)); // true
   *
   * const notAStdStream = new Writable();
   * console.log(TerminalFormatter.isStdStream(notAStdStream)); // false
   * ```
   *
   * @param stream - The writable stream to check.
   * @returns Returns `true` if the stream's `fd` is 1 or 2, otherwise `false`.
   *
   * @internal
   * @since 5.0.0
   * @see {@link isStdout} to specifically check for stdout.
   * @see {@link isStderr} to specifically check for stderr.
   */
  static isStdStream(stream: ConsoleStreamLike & { fd: 1 | 2 }): true;
  static isStdStream(stream: ConsoleStreamLike): boolean;
  static isStdStream(stream: ConsoleStreamLike): boolean {
    return this._isStdStreamImpl(stream);
  }

  
  /**
   * Checks if a given stream is specifically standard output (stdout).
   *
   * @remarks
   * This is a convenient alternative to `isStdStream(stream, 1)`.
   * The overload provides a specific `true` return type when the check passes,
   * which can be used as a type guard.
   *
   * @example
   * ```ts
   * if (TerminalFormatter.isStdout(process.stdout)) {
   *   // process.stdout is now known to be of type:
   *   // NodeJS.WritableStream & { fd: 1 }
   *   console.log('Stream is stdout!');
   * }
   *
   * console.log(TerminalFormatter.isStdout(process.stderr)); // false
   * ```
   *
   * @param stream - The writable stream to check.
   * @returns Returns `true` if the stream's `fd` is exactly 1, otherwise `false`.
   *
   * @internal
   * @since 5.0.0
   * @see {@link isStdStream} for checking for either stdout or stderr.
   */
  static isStdout(stream: ConsoleStreamLike & { fd: 1 }): true;
  static isStdout(stream: ConsoleStreamLike): boolean;
  static isStdout(stream: ConsoleStreamLike): boolean {
    return this._isStdStreamImpl(stream, 1);
  }

  /**
   * Checks if a given stream is specifically standard error (stderr).
   *
   * @remarks
   * This is a convenient alternative to `isStdStream(stream, 2)`.
   * The overload provides a specific `true` return type when the check passes,
   * which can be used as a type guard.
   *
   * @example
   * ```ts
   * if (TerminalFormatter.isStdout(process.stderr)) {
   *   // process.stderr is now known to be of type:
   *   // NodeJS.WritableStream & { fd: 2 }
   *   console.log('Stream is stderr!');
   * }
   *
   * console.log(TerminalFormatter.isStderr(process.stdout)); // false
   * ```
   *
   * @param stream - The writable stream to check.
   * @returns Returns `true` if the stream's `fd` is exactly 2, otherwise `false`.
   *
   * @internal
   * @since 5.0.0
   * @see {@link isStdStream} for checking for either stdout or stderr.
   */
  static isStderr(stream: ConsoleStreamLike & { fd: 2 }): true;
  static isStderr(stream: ConsoleStreamLike): boolean;
  static isStderr(stream: ConsoleStreamLike): boolean {
    return this._isStdStreamImpl(stream, 2);
  }

  /**
   * Strips ANSI escape codes from a given string, or preserves them based on the stream's TTY status and a flag.
   *
   * @param text - The input string which may contain ANSI escape codes.
   * @param stream - The writable stream to check its TTY status.
   * @param preserve - If `true`, ANSI escape codes are preserved even if `stream.isTTY` is `false`.
   * @returns If `stream.isTTY` is `true`, the original string containing ANSI escape codes is returned.
   *          If `stream.isTTY` is `false`, a `string` with ANSI escape codes stripped is returned.
   *
   * @internal
   * @since 5.0.0
   */
  static stripANSI(text: string, stream: ConsoleStreamLike & { isTTY: true }): string;
  static stripANSI(text: string, stream: ConsoleStreamLike, preserve: true): string;
  static stripANSI(text: string, stream: ConsoleStreamLike, preserve?: boolean): string;
  static stripANSI(
    text: string,
    stream: ConsoleStreamLike,
    preserve?: boolean
  ): string {
    return preserve ? text : (
      (stream as TTYWriteStream)?.isTTY === true ? text : stripVTControlCharacters(text)
    );
  }

  /**
   * Clears the current line in a TTY stream.
   *
   * It only performs these actions if the provided stream is a TTY (i.e., `stream.isTTY` is `true`).
   * An optional callback function can be provided, which will be executed after the clear operation
   * (or immediately if the stream is not a TTY).
   *
   * @param stream - The writable stream to clear the line on. Must be a {@link NodeJS.WriteStream}.
   * @param reset - If `true`, the cursor will be moved to the beginning of the line before clearing.
   * @param cb - An optional callback function to execute after the line is cleared.
   *
   * @internal
   * @since 5.0.0
   */
  static clearLine(stream: ConsoleStreamLike, cb?: NoParamFunction<void>): void;
  static clearLine(stream: ConsoleStreamLike, reset?: boolean | NoParamFunction<void> | null, cb?: NoParamFunction<void>): void;
  static clearLine(
    stream: ConsoleStreamLike,
    reset?: boolean | NoParamFunction<void> | null,
    cb?: () => void
  ): void {
    if (TypeUtils.isCallable(reset)) {
      cb = reset as typeof cb;
      reset = true;
    } else if (TypeUtils.isNullOrUndefined(reset)) {
      reset = true;
    }

    if (stream instanceof TTYWriteStream && stream.isTTY) {
      if (reset) stream.cursorTo(0);
      stream.clearLine(0);
    }

    // Call the optional callback
    if (TypeUtils.isCallable(cb)) cb();
  }
}
