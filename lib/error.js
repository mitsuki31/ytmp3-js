/**
 * A module contains all custom error classes for **YTMP3-JS** project.
 *
 * @author    Ryuu Mitsuki (https://github.com/mitsuki31)
 * @license   MIT
 * @since     1.1.0
 */

'use strict';

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

exports = {
  IDExtractorError,
  UnknownOptionError
};
