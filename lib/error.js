/**
 * A module contains all custom error classes for **YTMP3-JS** project.
 *
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     1.1.0
 */

'use strict';

const { isPlainObject } = require('./utils/type-utils');

/**
 * @classdesc Represents an error that occurred during video ID extraction.
 *
 * @extends Error
 * @global
 * @since   1.1.0
 */
class IDExtractorError extends Error {}

/**
 * @classdesc Represents an error that occurred when given
 *            YouTube video ID is invalid during validation.
 *
 * @extends Error
 * @global
 * @since   2.0.0
 */
class IDValidationError extends Error {}

/**
 * @classdesc Represents an error that occurred when given
 *            YouTube video URL is invalid during validation.
 *
 * @extends Error
 * @global
 * @since   2.0.0
 */
class URLValidationError extends Error {}

/**
 * @classdesc Represents an error that occurred due to invalid or unknown YouTube domain.
 *
 * @extends Error
 * @global
 * @since   2.0.0
 */
class UnknownYouTubeDomainError extends Error {}

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
 * @classdesc Represents an error that occurred during cache validation.
 *
 * This can be thrown when the cache object is invalid or does not meet the expected format.
 *
 * @param {string | Error} error - The error message or an instance of an `Error`.
 * @param {Object} [options] - Additional options for the error.
 * @param {string} [options.id] - The ID of the cache object.
 * @param {string} [options.type] - The type of the cache object.
 * @param {string} [options.path] - The path of the cache object.
 * @param {Error} [options.cause] - The cause of the error, if applicable.
 *
 * @extends Error
 * @global
 * @since   2.0.0
 */
class CacheValidationError extends Error {
  #knownProps = ['type', 'id', 'path'];

  constructor(error, options) {
    super(error, options);
    if (error instanceof Error) {
      this.message = error.message;
    } else {
      this.message = error;
    }

    if (isPlainObject(options)) {
      this.#knownProps.forEach(prop => {
        this[prop] = options[prop];
        if (typeof this[prop] !== 'string') delete this[prop];
      });
      if (!(this.cause instanceof Error)) delete this.cause;
    }
  }
}

/**
 * @classdesc This error is typically thrown when a value does not match the expected type.
 *
 * @extends Error
 * @param {string | Error} error - The error message or an instance of an `Error`.
 * @param {Object} [options] - Additional options for the error.
 * @param {string} [options.actualType] - The actual type of the value that caused the error.
 * @param {string} [options.expectedType] - The expected type of the value.
 * @param {string} [options.name] - The property or symbol name that cause this error.
 * @param {string} [options.symbolName] - Similar to `options.name` parameter.
 * @param {Error} [options.cause] - The underlying error that caused this error, if applicable.
 * @global
 * @since   1.1.0
 */
class InvalidTypeError extends Error {
  #knownProps = ['actualType', 'expectedType', 'symbolName'];

  constructor(error, options) {
    super(error, options);
    if (error instanceof Error) {
      this.message = error.message;
    } else {
      this.message = error;
    }

    if (isPlainObject(options)) {
      this.#knownProps.forEach(prop => {
        this[prop] = options[prop];
        if (prop === 'symbolName' && !this[prop]) this[prop] = options.name;
        if (typeof this[prop] !== 'string') delete this[prop];
      });
      if (!(this.cause instanceof Error)) delete this.cause;
    }
  }
}

/**
 * @classdesc This error is typically thrown when a user specified configuration file
 * is invalid or cannot be processed correctly.
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
 * @since   2.0.0
 */
class ConfigParserError extends Error {
  #knownProps = ['errno', 'code', 'syscall', 'path'];

  constructor(error, options) {
    super(error, options);
    if (error instanceof Error) {
      this.message = error.message;
      this.stack = error.stack;
    } else {
      this.message = error;
    }

    if (isPlainObject(options)) {
      if (options.cause instanceof Error) {
        this.#knownProps.forEach(prop => {
          this[prop] = options.cause[prop];
          if (typeof this[prop] !== 'string') delete this[prop];
        });
      } else {
        delete this.cause;
      }
      // `options.path` is able to override the `path` property
      // even though it has already assigned with `options.cause.path` value;
      // unless the `options.path` type is not a string
      if (typeof options.path === 'string') this.path = options.path;
    }
  }
}

/**
 * @classdesc This error is typically thrown when a global configuration file is invalid
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
  #knownProps = ['errno', 'code', 'syscall', 'path'];

  constructor(error, options) {
    super(error, options);
    if (error instanceof Error) {
      this.message = error.message;
      this.stack = error.stack;
    } else {
      this.message = error;
    }

    if (isPlainObject(options)) {
      if (options.cause instanceof Error) {
        this.#knownProps.forEach(prop => {
          this[prop] = options.cause[prop];
          if ((prop !== 'errno' && typeof this[prop] !== 'string')
              || (prop === 'errno' && typeof this.errno !== 'number')) {
            delete this[prop];
          }
        });
      } else {
        delete this.cause;
      }
      // `options.path` is able to override the `path` property
      // even though it has already assigned with `options.cause.path` value;
      // unless the `options.path` type is not a string
      if (typeof options.path === 'string') this.path = options.path;
    }
  }
}


module.exports = {
  IDExtractorError,
  IDValidationError,
  URLValidationError,
  UnknownYouTubeDomainError,
  UnknownOptionError,
  CacheValidationError,
  InvalidTypeError,
  ConfigParserError,
  GlobalConfigParserError
};
