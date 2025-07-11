/**
 * This module provides custom error classes for common application-specific error scenarios.
 *
 * It aims to offer more detailed and structured error information beyond Node.js's built-in `Error` class,
 * facilitating easier debugging and error handling.
 *
 * @module   utils/error
 * @author   Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license  MIT
 * @since    1.1.0
 */

import { constants } from 'node:os';
import { TypeUtils } from '#/vendor/type-utils';

/**
 * Represents options for creating an `Error` object.
 * @internal
 */
export interface ErrorOptions {
  cause?: Error;
}

/**
 * Returns the standard Unix exit code associated with a given signal name.
 *
 * This function maps a signal string (e.g., `SIGINT`, `SIGTERM`) to its corresponding
 * numeric signal value using `os.constants.signals`, then returns the standard exit code
 * calculated as `128 + signal`.
 *
 * If the signal is unknown or not found in `os.signals`, it defaults to `1`.
 *
 * @param   signal - A signal name such as `SIGINT` or `SIGTERM`
 * @returns The corresponding Unix exit code, or `1` if the signal is unrecognized
 *
 * @internal
 * @since   2.0.0
 */
export function getExitCodeFromSignal(signal: NodeJS.Signals) {
  const signalNumber = constants.signals[signal];
  return signalNumber !== undefined ? (128 + signalNumber) : 1;
}


// #region Error Classes

/**
 * Represents an error that occurs during argument parsing.
 *
 * @extends Error
 * @public
 * @since   5.0.0
 */
export class ArgumentParserError extends Error {
  readonly name = 'ArgumentParserError' as const;
}

/**
 * Represents an error that occurs during cache validation.
 *
 * Thrown when the cache object is invalid or does not meet the expected format.
 *
 * This custom error class extends the built-in `Error` and provides
 * additional context specific to cache objects, such as their type, ID, and path.
 *
 * @extends Error
 * @public
 * @since 5.0.0
 */
export class CacheValidationError extends Error {
  readonly name = 'CacheValidationError' as const;

  /**
   * An internal list of known properties that can be set from the options.
   * This is used to filter and assign properties provided in the constructor options.
   * @private
   */
  #_knownProps = ['type', 'id', 'path'] as const;

  /**
   * The type of the cache object that caused the validation error.
   */
  type?: string;
  /**
   * The unique identifier (ID) of the cache object that caused the validation error.
   */
  id?: string;
  /**
   * The file path or storage location of the cache object that caused the validation error.
   * This provides context about where the problematic cache object is located.
   */
  path?: string;
  cause?: Error;

  /**
   * Creates an instance of `CacheValidationError`.
   *
   * The constructor allows initializing the error with a message or an existing `Error` object,
   * and can optionally provide additional context properties (`type`, `id`, `path`)
   * and a `cause` for chained errors.
   *
   * @param error - The error message string or an existing `Error` object.
   *                If an `Error` object is provided, its `message` will be used.
   * @param options - Optional configuration object for the error.
   * @param options.type - The type of the cache object.
   * @param options.id - The ID of the cache object.
   * @param options.path - The path of the cache object.
   * @param options.cause - The original error that caused this (for error chaining).
   */
  constructor(error: Error | string, options?: ErrorOptions & {
    /** The type of the cache object. */
    type?: string;
    /** The ID of the cache object. */
    id?: string;
    /** The path of the cache object. */
    path?: string;
  }) {
    // Call the parent Error constructor.
    super(error instanceof Error ? error.message : error);

    // If an Error object was passed, ensure its message is used,
    // otherwise use the provided string directly.
    if (error instanceof Error) {
      this.message = error.message;
    } else {
      this.message = error;
    }
    
    // Assign known properties from options, ensuring they are strings.
    // Properties that are not strings or are not 'knownProps' will be ignored or deleted.
    if (TypeUtils.isPlainObject(options)) {
      this.#_knownProps.forEach(prop => {
        const value = options[prop];
        // Safely check if the value is a string before assigning
        if (typeof value === 'string') {
          this[prop] = value;
        } else {
          // If it's not a string, delete it to ensure the property is either string or undefined
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete this[prop];
        }
      });
      this.cause = options.cause instanceof Error ? options.cause : undefined;
    }
  }
}

/**
 * Represents an error that occurs when a user-specified configuration file
 * is invalid or cannot be processed correctly.
 *
 * This error class extends the built-in `Error` and provides additional context
 * such as specific system error properties (`errno`, `code`, `syscall`)
 * and the file `path` involved in the configuration parsing failure.
 *
 * @extends Error
 * @since 2.0.0
 */
export class ConfigParserError extends Error {
  readonly name = 'ConfigParserError' as const;

  /**
   * An internal list of known properties that can be extracted from the `cause`
   * error object and assigned to this error instance.
   * @private
   */
  #_knownProps = ['errno', 'code', 'syscall', 'path'] as const;

  /**
   * The system-specific error number from the underlying error (e.g., EACCES, ENOENT).
   * Typically available for I/O errors.
   */
  errno?: number;
  /**
   * The string error code from the underlying error (e.g., 'EACCES', 'ENOENT').
   * Typically available for I/O errors.
   */
  code?: string;
  /**
   * The name of the system call that caused the underlying error (e.g., 'open', 'read', 'write').
   * Typically available for I/O errors.
   */
  syscall?: string;
  /**
   * The file path that was involved in the configuration parsing error.
   * This property can be directly set via `options.path` or derived from `options.cause.path`.
   */
  path?: string;
  cause?: NodeJS.ErrnoException;

  /**
   * Creates an instance of `ConfigParserError`.
   *
   * @param error - The error message string or an existing `Error` object.
   *                If an `Error` object is provided, its `message` will be used as the base message.
   * @param options - Additional options for the error, providing context from the underlying cause
   *                  or specific to the configuration file.
   * @param options.cause - The underlying error that caused this (for error chaining).
   *                        This error's properties (`errno`, `code`, `syscall`, `path`) will be
   *                        extracted if available.
   * @param options.path - An optional file path string. If provided, this value will override
   *                       any `path` property extracted from `options.cause`.
   *
   * @example
   * ```ts
   * try {
   *   // ... parse config ...
   * } catch (originalError) {
   *   if (originalError instanceof Error) {
   *     throw new ConfigParserError("Failed to parse config file.", {
   *       cause: originalError,
   *       path: '/home/.../app/config.json'
   *     });
   *   }
   * }
   * ```
   */
  constructor(error: Error | string, options?: {
    /**
     * The underlying error that caused this (for error chaining).
     * This error's properties (`errno`, `code`, `syscall`, `path`) will be
     * extracted if available.
     */
    cause: NodeJS.ErrnoException,
    /**
     * An optional file path string. If provided, this value will override
     * any `path` property extracted from `options.cause`.
     */
    path?: string
  }) {
    super(error instanceof Error ? error.message : error);
    if (error instanceof Error) {
      this.message = error.message;
    } else {
      this.message = error;
    }

    if (TypeUtils.isPlainObject(options) && options.cause instanceof Error) {
      this.#_knownProps.forEach(prop => {
        const value = options.cause[prop];
        if (prop !== 'errno' && typeof value === 'string') {
          this[prop] = value;
        }
        // Check for number type for 'errno'
        else if (prop === 'errno' && typeof value === 'number') {
          this.errno = value;
        }
        // If the property from cause doesn't match the expected type, ensure it's not set.
        else {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete this[prop];
        }
      });
      this.cause = options.cause instanceof Error ? options.cause : undefined;
    } else {
      delete this.cause;
    }

    // `options.path` is able to override the `path` property
    // even if it has already been assigned with `options.cause.path` value.
    // This provides explicit control for the user.
    if (TypeUtils.isPlainObject(options) && typeof options.path === 'string') {
      this.path = options.path;
    }
  }
}

/**
 * Represents an error that occurs when a DNS lookup times out.
 *
 * @extends Error
 * @since 5.0.0
 */
export class DNSLookupTimeoutError extends Error {
  readonly name = 'DNSLookupTimeoutError' as const;

  #_knownProps = ['timeout', 'hostname'] as const;

  /** The DNS lookup timeout in milliseconds */
  timeout?: number;
  /** The hostname that timed out */
  hostname?: string;

  /**
   * Creates an instance of a DNS lookup timeout error.
   *
   * This constructor allows initializing the error with a message or an existing `Error` object,
   * and can optionally provide additional context properties (`timeout`, `hostname`).
   *
   * @param error - The error message string or an existing `Error` object.
   *                If an `Error` object is provided, its `message` will be used.
   * @param options - Optional configuration object for the error.
   */
  constructor(error: Error | string, options?: ErrorOptions & {
    /** The DNS lookup timeout in milliseconds */
    timeout?: number;
    /** The hostname that timed out */
    hostname?: string;
  }) {
    super(error instanceof Error ? error.message : error);
    if (error instanceof Error) {
      this.message = error.message;
    } else {
      this.message = error;
    }

    // Assign known properties from options, ensuring they are strings.
    // Properties that are not strings or are not 'knownProps' will be ignored or deleted.
    if (TypeUtils.isPlainObject(options)) {
      this.#_knownProps.forEach(prop => {
        const value = options[prop];
        // Safely check if the value is a string before assigning
        if (typeof value === 'string' || typeof value === 'number') {
          (this[prop] as string | number) = value;
        } else {
          // If it's not a string, delete it to ensure the property is either string or undefined
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete this[prop];
        }
      });
    }
  }
}

/**
 * Represents an error that occurs when the global configuration file
 * is invalid or cannot be processed correctly.
 *
 * This error class extends the built-in `Error` and provides additional context
 * such as specific system error properties (`errno`, `code`, `syscall`)
 * and the file `path` involved in the configuration parsing failure.
 *
 * @extends Error
 * @since 1.1.0
 */
export class GlobalConfigParserError extends Error {
  readonly name = 'GlobalConfigParserError' as const

  /**
   * An internal list of known properties that can be extracted from the `cause`
   * error object and assigned to this error instance.
   * @private
   */
  #_knownProps = ['errno', 'code', 'syscall', 'path'] as const;

  /**
   * The system-specific error number from the underlying error (e.g., EACCES, ENOENT).
   * Typically available for I/O errors.
   */
  errno?: number;
  /**
   * The string error code from the underlying error (e.g., 'EACCES', 'ENOENT').
   * Typically available for I/O errors.
   */
  code?: string;
  /**
   * The name of the system call that caused the underlying error (e.g., 'open', 'read', 'write').
   * Typically available for I/O errors.
   */
  syscall?: string;
  /**
   * The file path that was involved in the configuration parsing error.
   * This property can be directly set via `options.path` or derived from `options.cause.path`.
   */
  path?: string;
  cause?: NodeJS.ErrnoException;

  /**
   * Creates an instance of `GlobalConfigParserError`.
   *
   * @param error - The error message string or an existing `Error` object.
   *                If an `Error` object is provided, its `message` will be used as the base message.
   * @param options - Additional options for the error, providing context from the underlying cause
   *                  or specific to the configuration file.
   * @param options.cause - The underlying error that caused this (for error chaining).
   *                        This error's properties (`errno`, `code`, `syscall`, `path`) will be
   *                        extracted if available.
   * @param options.path - An optional file path string. If provided, this value will override
   *                       any `path` property extracted from `options.cause`.
   *
   * @example
   * ```ts
   * try {
   *   // ... parse config ...
   * } catch (originalError) {
   *   if (originalError instanceof Error) {
   *     throw new GlobalConfigParserError("Failed to parse config file.", {
   *       cause: originalError,
   *       path: '/home/.../app/config.json'
   *     });
   *   }
   * }
   * ```
   */
  constructor(error: Error | string, options?: {
    /**
     * The underlying error that caused this (for error chaining).
     * This error's properties (`errno`, `code`, `syscall`, `path`) will be
     * extracted if available.
     */
    cause: NodeJS.ErrnoException,
    /**
     * An optional file path string. If provided, this value will override
     * any `path` property extracted from `options.cause`.
     */
    path?: string
  }) {
    super(error instanceof Error ? error.message : error);
    if (error instanceof Error) {
      this.message = error.message;
    } else {
      this.message = error;
    }

    if (TypeUtils.isPlainObject(options) && options.cause instanceof Error) {
      this.#_knownProps.forEach(prop => {
        const value = options.cause[prop];
        if (prop !== 'errno' && typeof value === 'string') {
          this[prop] = value;
        }
        // Check for number type for 'errno'
        else if (prop === 'errno' && typeof value === 'number') {
          this.errno = value;
        }
        // If the property from cause doesn't match the expected type, ensure it's not set.
        else {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete this[prop];
        }
      });
      this.cause = options.cause instanceof Error ? options.cause : undefined;
    } else {
      delete this.cause;
    }

    // `options.path` is able to override the `path` property
    // even if it has already been assigned with `options.cause.path` value.
    // This provides explicit control for the user.
    if (TypeUtils.isPlainObject(options) && typeof options.path === 'string') {
      this.path = options.path;
    }
  }
}

/**
 * Represents an error that occurred during video ID extraction.
 *
 * @extends Error
 * @public
 * @since   1.1.0
 */
export class IDExtractorError extends Error {
  readonly name = 'IDExtractorError' as const;
}

/**
 * Represents an error that occurred when given YouTube video ID is invalid during validation.
 *
 * @extends Error
 * @public
 * @since   2.0.0
 */
export class IDValidationError extends Error {
  readonly name = 'IDValidationError' as const;
}

/**
 * This error is typically thrown when a value does not match the expected type.
 * It extends the built-in `Error` and provides additional context about
 * the actual and expected types, and optionally the name of the symbol or property
 * that caused the type mismatch.
 *
 * @extends Error
 * @since 1.1.0
 */
export class InvalidTypeError extends Error {
  readonly name = 'InvalidTypeError' as const;

  /**
   * An internal list of known properties that can be set from the options.
   * This is used to filter and assign properties provided in the constructor options.
   * @private
   */
  #_knownProps = ['actualType', 'expectedType', 'symbolName'] as const;

  /**
   * The actual type of the value that caused the error.
   *
   * For example, if a function expected a `string` but received a `number`,
   * `actualType` would be `'number'`.
   */
  actualType?: string;
  /**
   * The expected type of the value.
   *
   * For example, if a function expected a `string` but received a `number`,
   * `expectedType` would be `'string'`.
   */
  expectedType?: string;
  /**
   * The name of the property, variable, or symbol that caused this error.
   *
   * This provides context about *where* the type mismatch occurred.
   * If `symbolName` is not provided in options, `name` from options is used as fallback.
   */
  symbolName?: string;
  cause?: Error;

  constructor(error: Error | string, options?: ErrorOptions & {
    /**
     * The actual type of the value that caused the error.
     *
     * For example, if a function expected a `string` but received a `number`,
     * `actualType` would be `'number'`.
     */
    actualType?: string;
    /**
     * The expected type of the value.
     *
     * For example, if a function expected a `string` but received a `number`,
     * `expectedType` would be `'string'`.
     */
    expectedType?: string;
    /** The alias for {@linkcode symbolName} property. */
    name?: string;
    /**
     * The name of the property, variable, or symbol that caused this error.
     *
     * This provides context about *where* the type mismatch occurred.
     * If `symbolName` is not provided in options, `name` from options is used as fallback.
     */
    symbolName?: string;
  }) {
    super(error instanceof Error ? error.message : error);
    if (error instanceof Error) {
      this.message = error.message;
    } else {
      this.message = error;
    }

    if (TypeUtils.isPlainObject(options)) {
      this.#_knownProps.forEach(prop => {
        const value = options[prop];
        if (typeof value === 'string') {
          this[prop] = value;
          if (prop === 'symbolName' && !this[prop]) this[prop] = options.name as string;
        }
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        if (typeof this[prop] !== 'string') delete this[prop];
      });
      this.cause = options.cause instanceof Error ? options.cause : undefined;
    }
  }
}

/**
 * Represents an error that occurred when given YouTube video URL is invalid during validation.
 *
 * @extends Error
 * @public
 * @since   2.0.0
 */
export class URLValidationError extends Error {
  readonly name = 'URLValidationError' as const;
}

/**
 * Represents the error that occurred due to defining an unknown
 * option in the configuration object and may throw during configuration validation.
 *
 * @extends Error
 * @public
 * @since   1.0.0
 */
export class UnknownOptionError extends Error {
  readonly name = 'UnknownOptionError' as const;
}

/**
 * Represents an error that occurred due to invalid or unknown YouTube domain.
 *
 * @extends Error
 * @public
 * @since   2.0.0
 */
export class UnknownYouTubeDomainError extends Error {
  readonly name = 'UnknownYouTubeDomainError' as const;
}

// #endregion Error Classes
