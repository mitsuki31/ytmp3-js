/**
 * @module    utils/stream
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import { Duplex, Readable, Transform, Writable } from 'node:stream';
import { createWriteStream, createReadStream, type PathLike } from 'node:fs';
import { WriteStream as TTYWriteStream } from 'node:tty';
import { InvalidTypeError } from '#error';

/**
 * Type representation for Node.js streams.
 *
 * @internal
 * @since 5.0.0
 */
export type NodeJSStream = Readable | Writable | Duplex;

// Helper type for checking if a stream has a 'closed' property
// For Node.js version < 16.5.0
type StreamWithOptionalClosed = (Readable | Writable | Duplex) & { closed?: boolean };
/**
 * Type representation for legacy Node.js streams.
 * @experimental
 * @internal
 * @since 5.0.0
 */
export type LegacyReadable = Readable & { _readableState?: { ended?: boolean } };
/**
 * Type representation for legacy Node.js streams.
 * @experimental
 * @internal
 * @since 5.0.0
 */
export type LegacyWritable = Writable & { _writableState?: { ended?: boolean } };

/**
 * Options for creating a readable file stream.
 *
 * This type is derived from the second parameter of Node.js's {@linkcode createReadStream} function.
 *
 * @internal
 * @see {@link https://nodejs.org/api/fs.html#fs_fs_createreadstream_path_options | Node.js Documentation: `fs.createReadStream`}
 */
export type ReadStreamOptions = Parameters<typeof createReadStream>[1];
/**
 * Options for creating a writable file stream.
 *
 * This type is derived from the second parameter of Node.js's {@linkcode createWriteStream} function.
 *
 * @internal
 * @see {@link https://nodejs.org/api/fs.html#fs_fs_createwritestream_path_options | Node.js Documentation: `fs.createWriteStream`}
 */
export type WriteStreamOptions = Parameters<typeof createWriteStream>[1];

/**
 * Enumeration of stream types. Used for creating streams using the {@linkcode createStream} function.
 *
 * @internal
 * @since 5.0.0
 */
export enum CreateStreamType {
  /** Create a readable stream */
  Readable = 'r',
  /** Create a writable stream */
  Writable = 'w'
};


/**
 * Checks if a legacy Node.js stream has finished reading.
 *
 * @param stream - The Node.js stream to check.
 * @returns `true` if the stream's internal `_readableState.ended` property is `true`, otherwise `false`.
 *
 * @remarks
 * This function accesses the internal `_readableState` property, which is not part of the public API
 * and may not be available in all stream implementations.
 *
 * @experimental
 * @internal
 * @since 5.0.0
 */
export function isReadEndedLegacy(stream: NodeJSStream): boolean {
  return (stream as LegacyReadable)._readableState?.ended ?? false;
}

/**
 * Checks if a legacy Node.js stream has finished writing.
 *
 * @param stream - The Node.js stream to check.
 * @returns `true` if the stream's internal `_writableState.ended` property is `true`, otherwise `false`.
 *
 * @remarks
 * This function accesses the internal `_writableState` property, which is not part of the public API
 * and may not be available in all stream implementations.
 *
 * @experimental
 * @internal
 * @since 5.0.0
 */
export function isWriteEndedLegacy(stream: NodeJSStream): boolean {
  return (stream as LegacyWritable)._writableState?.ended ?? false;
}

/**
 * Checks if a given value is either readable, writable, or duplex (both) Node.js stream.
 *
 * @param val - The value to check.
 * @returns `true` if the value is an instance of `Writable` or `Readable`, `false` otherwise.
 *
 * @note For {@linkcode Transform} streams, this function returns `true`. Because it extends the {@linkcode Duplex} class.
 *
 * @internal
 * @since 5.0.0
 */
export function isStream(val: unknown): val is NodeJSStream {
  return val instanceof Writable || val instanceof Readable || val instanceof Duplex;
}

/**
 * Checks if a given value is a Readable Node.js stream.
 *
 * @param val - The value to check.
 * @returns `true` if the value is an instance of `Readable`, `false` otherwise.
 *
 * @internal
 * @since 5.0.0
 */
export function isReadableStream(val: unknown): val is Readable {
  return val instanceof Readable;
}

/**
 * Checks if a given value is a Writable Node.js stream.
 *
 * @param val - The value to check.
 * @returns `true` if the value is an instance of `Writable`, `false` otherwise.
 *
 * @internal
 * @since 5.0.0
 */
export function isWritableStream(val: unknown): val is Writable {
  return val instanceof Writable;
}

/**
 * Checks if a given value is a Duplex Node.js stream.
 *
 * Duplex streams are both Readable and Writable.
 *
 * @param val - The value to check.
 * @returns `true` if the value is an instance of `Duplex`, `false` otherwise.
 *
 * @internal
 * @since 5.0.0
 */
export function isDuplexStream(val: unknown): val is Duplex {
  return val instanceof Duplex;
}

/**
 * Checks if a given value is a Transform Node.js stream.
 *
 * Transform streams are {@link Duplex} streams that modify or transform data as it is written and read.
 *
 * @param val - The value to check.
 * @returns `true` if the value is an instance of `Transform`, `false` otherwise.
 *
 * @internal
 * @since 5.0.0
 */
export function isTransformStream(val: unknown): val is Transform {
  return val instanceof Transform;
}

/**
 * Checks if a Node.js stream is closed.
 *
 * This function attempts to use the `stream.closed` property (available in Node.js v16.5.0 and later).
 * For older Node.js versions (e.g., v14), it falls back to checking `stream.destroyed`
 * and whether the stream has emitted its `'end'` (for {@link Readable}) or `'finish'` (for {@link Writable}) events,
 * and whether it has also emitted a 'close' event.
 *
 * @note
 * It is important to note that a stream being "closed" can be a nuanced state.
 *
 * @param stream The Node.js stream to check.
 * @returns `true` if the stream is considered closed, `false` otherwise.
 *
 * @internal
 * @since 5.0.0
 */
export function isStreamClosed(stream: NodeJSStream): boolean {
  const s = stream;

  // Check for the `closed` property (Node.js v16.5.0+)
  // We explicitly check for its existence to avoid runtime errors on older versions.
  if (typeof (stream as StreamWithOptionalClosed).closed === 'boolean') {
    return (stream as StreamWithOptionalClosed).closed;
  }

  // Fallback for older Node.js versions (e.g., v14)
  // In older versions, a stream is typically considered "closed" when:
  // a) It has been destroyed (`stream.destroyed` is true).
  // b) For readable streams, it has emitted the 'end' event.
  // c) For writable streams, it has emitted the 'finish' event.
  // d) It has emitted the 'close' event (which signifies underlying resource closure).

  // `destroyed` property is available in older Node.js versions as well.
  if (stream.destroyed) return true;

  // Check for 'end' or 'finish' combined with 'close' event
  // However, relying solely on events for a *synchronous* check is tricky.
  // Streams only emit these events *after* they are closed/finished.
  // We can't synchronously check if an event *has been emitted* without tracking state.

  // The most reliable way for older versions, in a synchronous check,
  // is often to combine `destroyed` with internal state (which is often private/unstable).
  // The official recommendation for "finished" streams before `stream.finished` was
  // to listen to 'end' for readable and 'finish' for writable.
  // For a synchronous `isStreamClosed` function that works across versions,
  // the `destroyed` property is the most robust and publicly available indicator
  // for a "terminal" state in older versions.

  if (stream instanceof Readable) {
    // `readableEnded` was introduced in v12.9.0 (Readable) / v11.10.0 (Writable)
    // It indicates that no more data will be emitted.
    // 'closed' implies the underlying resource is closed.
    return stream.readableEnded || isReadEndedLegacy(stream);
  }

  if (stream instanceof Writable) {
    // `writableEnded` was introduced in v11.10.0
    // It indicates that `end()` has been called.
    return stream.writableEnded || isWriteEndedLegacy(stream);
  }

  // For Duplex/Transform streams, if they are both readable and writable,
  // we can check if both sides have ended/finished.
  // This might be a slightly more complex state to define "closed" for Duplex.
  // For simplicity, if it's a Duplex and the `closed` property isn't available,
  // we can assume it's closed if both `readableEnded` and `writableEnded` are true,
  // or if it's destroyed.
  if (s instanceof Duplex) {
    return (
      ((s as Duplex).readableEnded || isReadEndedLegacy(s)) &&
      ((s as Duplex).writableEnded || isWriteEndedLegacy(s))
    );
  }

  return false;  // If none of the above, consider it's not closed.
}

/**
 * Checks if a Node.js stream has been destroyed.
 *
 * A destroyed stream means it has been explicitly torn down (e.g., by calling `stream.destroy()`).
 *
 * @param stream - The Node.js stream to check.
 * @returns `true` if the stream is destroyed, `false` otherwise.
 *
 * @internal
 * @since 5.0.0
 */
export function isStreamDestroyed(stream: NodeJSStream): boolean {
  return stream.destroyed;
}

/**
 * Checks if a stream is currently safe to read from.
 *
 * A stream is considered "read-safe" if its `readable` property is `true`.
 * This property indicates that the stream has not yet ended or encountered
 * a fatal error on the readable side.
 *
 * @param stream - The writable stream to check.
 * @returns `true` if the stream is currently readable, `false` otherwise.
 *
 * @internal
 * @since 5.0.0
 */
export function isReadSafe(stream: Readable | Duplex): boolean {
  // `stream.readable` is a boolean property indicating if data can be read from the stream
  return stream.readable ?? false;
}

/**
 * Checks if a stream is currently safe to write to.
 *
 * A stream is considered "write-safe" if its `writable` property is `true`.
 * This property indicates that the stream has not yet ended writing or encountered
 * a fatal error on the writable side.
 *
 * @param stream The writable stream to check.
 * @returns `true` if the stream is currently writable, `false` otherwise.
 *
 * @internal
 * @since 5.0.0
 */
export function isWriteSafe(stream: Writable | Duplex): boolean {
  // `stream.writable` is a boolean property indicating if data can be written to the stream
  return stream.writable ?? false;
}

/**
 * Checks if a general Node.js stream is "safe" based on its type.
 *
 * - For {@link Readable} streams, it checks if it's safe to read from.
 * - For {@link Writable} streams, it checks if it's safe to write to.
 * - For {@link Duplex} streams, it checks if it's safe to both read from and write to.
 *
 * @remarks
 * For advanced usage, if you want to check the {@link Duplex} stream, use {@link isReadSafe} to check
 * if it's safe to read and {@link isWriteSafe} to check if it's safe to write.
 *
 * @param stream - The Node.js stream to check.
 * @returns `true` if the stream is safe according to its type, `false` otherwise.
 *
 * @internal
 * @since 5.0.0
 */
export function isSafe(stream: NodeJSStream): boolean {
  if (stream instanceof Readable && stream instanceof Writable) {
    // This branch specifically catches Duplex streams, as they are both.
    // A Duplex stream being "safe" often implies it's ready for both reads and writes.
    return isReadSafe(stream) && isWriteSafe(stream);
  }
  if (stream instanceof Readable) {
    // This catches pure Readable streams.
    return isReadSafe(stream);
  }
  if (stream instanceof Writable) {
    // This catches pure Writable streams.
    return isWriteSafe(stream);
  }

  // Fallback for types not explicitly covered, though NodeJSStream should cover most cases.
  return false;
}

/**
 * Checks if a given stream is an instance of `tty.WriteStream` and is connected to a TTY (terminal).
 *
 * This function is particularly useful for verifying if `process.stdout` or `process.stderr`
 * are operating in a terminal environment, which often dictates whether
 * features like ANSI escape codes (for colors, cursor movement) should be used.
 *
 * It combines an `instanceof` check with the direct `isTTY` property check
 * to ensure both the type and the active TTY status.
 *
 * @param stream - The stream object to check. This function expects a stream
 *                 that could potentially be a `tty.WriteStream` (like `process.stdout` or `process.stderr`).
 * @returns `true` if the stream is both a `tty.WriteStream` instance AND its `isTTY`
 *          property is `true`, `false` otherwise.
 *
 * @example
 * ```ts
 * import { stdout, stderr } from 'process';
 *
 * if (isTTYStream(stdout)) {
 *   console.log('stdout is an active TTY stream. Colors and interactive elements are safe to use.');
 * } else {
 *   console.log('stdout is not an active TTY stream. Outputting plain text.');
 * }
 *
 * // Example with a non-TTY stream (e.g., redirected to a file)
 * import { createWriteStream } from 'fs';
 * const fileStream = createWriteStream('output.log');
 * console.log(isTTYStream(fileStream));  // This will typically be false
 * ```
 *
 * @internal
 * @since 5.0.0
 */
export function isTTYStream(stream: NodeJSStream): stream is TTYWriteStream {
  // Check if it's an instance of `tty.WriteStream` AND its `isTTY` property is true.
  return stream instanceof TTYWriteStream && (stream as TTYWriteStream).isTTY === true;
}


/**
 * Creates a Node.js readable stream from a given file path.
 *
 * @example
 * ```ts
 * const readableStream = createStream(CreateStreamType.Readable, '/path/to/file.txt');
 * ```
 *
 * ```ts
 * // You can also pass the type as a string
 * const writableStream = createStream('w', '/path/to/file.txt');
 * ```
 *
 * @param type - The type of stream to create, specifically {@linkcode CreateStreamType.Readable}.
 * @param path - The file path from which to read.
 * @param options - Optional configuration for the readable stream.
 *
 * @returns A `fs.ReadStream` instance.
 *
 * @internal
 * @since 5.0.0
 */
export function createStream<T extends CreateStreamType.Readable | 'r'>(type: T, path: PathLike, options?: ReadStreamOptions): Readable;
/**
 * Creates a Node.js writable stream to a given file path.
 *
 * @example
 * ```ts
 * const readableStream = createStream(CreateStreamType.Readable, '/path/to/file.txt');
 * ```
 *
 * ```ts
 * // You can also pass the type as a string
 * const writableStream = createStream('w', '/path/to/file.txt');
 * ```
 *
 * @param type - The type of stream to create, specifically {@linkcode CreateStreamType.Writable}.
 * @param path - The file path to which to write.
 * @param options - Optional configuration for the writable stream.
 *
 * @returns A `fs.WriteStream` instance.
 *
 * @internal
 * @since 5.0.0
 */
export function createStream<T extends CreateStreamType.Writable | 'w'>(type: T, path: PathLike, options?: WriteStreamOptions): Writable;

/**
 * Creates a Node.js readable or writable stream from a given file path.
 *
 * @example
 * ```ts
 * const readableStream = createStream(CreateStreamType.Readable, '/path/to/file.txt');
 * ```
 *
 * ```ts
 * // You can also pass the type as a string
 * const writableStream = createStream('w', '/path/to/file.txt');
 * ```
 *
 * @param type - The type of stream to create.
 * @param path - The file path from which to read or write data.
 * @param options - Optional configuration for the stream.
 *
 * @returns A stream instance.
 *
 * @internal
 * @since 5.0.0
 */
export function createStream<T extends CreateStreamType | 'r' | 'w'>(
  type: T,
  path: PathLike,  // Path is required for both Readable and Writable file streams
  options?: ReadStreamOptions | WriteStreamOptions
): Readable | Writable {
  options ??= {} as ReadStreamOptions | WriteStreamOptions;

  switch (type) {
    case CreateStreamType.Readable:
      return createReadStream(path, options as ReadStreamOptions);
    case CreateStreamType.Writable:
      return createWriteStream(path, options as WriteStreamOptions);
    default:
      // This case should ideally not be reached due to TypeScript overloads
      // but good for runtime safety
      throw new InvalidTypeError(`Unsupported stream type: ${type}`, {
        actualType: type,
        expectedType: Object.values(CreateStreamType).map(x => `"${x}"`).join(' | ')
      });
  }
}
