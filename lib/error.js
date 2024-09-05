/**
 * A module contains all custom error classes for **YTMP3-JS** project.
 *
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     1.1.0
 */

'use strict';

const { isPlainObject } = require('./utils');

/**
 * @classdesc Represents an error that occurred during video ID extraction.
 *
 * @extends Error
 * @global
 * @since   1.1.0
 */
class IDExtractorError extends Error {}

/**
 * @classdesc A class represents the error that occurred due to defining an unknown
 * option in the configuration object and may throw during configuration validation.
 *
 * @extends Error
 * @global
 * @since   1.0.0
 */
class UnknownOptionError extends Error {}

/**
 * @classdesc This error is typically thrown when a value does not match the expected type.
 *
 * @extends Error
 * @param {string | Error} error - The error message or an instance of an `Error`.
 * @param {Object} [options] - Additional options for the error.
 * @param {string} [options.actualType] - The actual type of the value that caused the error.
 * @param {string} [options.expectedType] - The expected type of the value.
 * @param {Error} [options.cause] - The underlying error that caused this error, if applicable.
 * @global
 * @since   1.1.0
 */
class InvalidTypeError extends Error {
  constructor(error, options) {
    super(error, options);
    if (error instanceof Error) {
      this.message = error.message;
    } else {
      this.message = error;
    }
    if (isPlainObject(options)) {
      this.actualType = options.actualType;
      this.expectedType = options.expectedType;
      this.cause = options.cause;

      if (typeof this.actualType !== 'string') delete this.actualType;
      if (typeof this.expectedType !== 'string') delete this.expectedType;
      if (!(this.cause instanceof Error)) delete this.cause;
    }
  }
}

/**
 * @classdesc This error is typically thrown when a configuration file is invalid
 * or cannot be processed correctly.
 *
 * @extends Error
 * @param {string | Error} error - The error message or an instance of an Error.
 * @param {Object} [options] - Additional options for the error.
 * @param {Error} [options.cause] - The underlying error that caused this error, if applicable.
 * @param {number} [options.cause.errno] - The error number from the underlying error.
 * @param {string} [options.cause.code] - The error code from the underlying error.
 * @param {string} [options.cause.syscall] - The system call that caused the underlying error.
 * @param {string} [options.cause.path] - The file path involved in the underlying error.
 * @global
 * @since   1.1.0
 */
class GlobalConfigParserError extends Error {
  constructor(error, options) {
    super(error instanceof Error ? error.message : error, options);
    if (error instanceof Error) {
      this.message = error.message;
      this.stack = error.stack;
    } else {
      this.message = error;
    }
    if (isPlainObject(options)) {
      if (options.cause instanceof Error) {
        this.errno = options.cause.errno;
        this.code = options.cause.code;
        this.syscall = options.cause.syscall;
        this.path = options.cause.path;
        if (!this.errno) delete this.errno;
        if (!this.code) delete this.code;
        if (!this.syscall) delete this.syscall;
        if (!this.path) delete this.path;
      }
    }
  }
}

module.exports = Object.freeze({
  IDExtractorError,
  UnknownOptionError,
  InvalidTypeError,
  GlobalConfigParserError
});
