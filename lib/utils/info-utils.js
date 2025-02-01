/**
 * @file A utility module that provides functions and classes for handling and processing
 *       YouTube format objects, as well as date and time formatting utilities.
 *
 * It is designed to enhance the usability of raw format data retrieved from
 * YouTube APIs by normalizing and transforming specific properties into
 * more user-friendly types and formats.
 *
 * ### Features
 * - **`DateFormatter` Class**: A utility for handling and formatting timestamps.
 * - **`FormatUtils` Namespace**: A collection of functions for working with YouTube
 *                                format objects, including parsing, and determining media capabilities.
 *
 * @module    utils/info-utils
 * @requires  error
 * @requires  utils/type-utils
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @since     2.0.0
 */

/**
 * @typedef  {Object} YTFormatObject
 * @property {string} mimeType - The MIME type of the format, e.g., `'audio/mp4; codecs="mp4a.40.2"'`.
 * @property {?string} qualityLabel - The video quality label (e.g., `'720p'`), or `null` for audio-only formats.
 * @property {?number} bitrate - The average bitrate in bits per second (bps).
 * @property {?number} audioBitrate - The audio bitrate in kilo bits per second (kbps), or `null` for video-only formats.
 * @property {number} itag - The format's unique identifier.
 * @property {string} url - The direct URL for downloading the format.
 * @property {?Object} initRange - Byte range for the initialization segment.
 * @property {string} initRange.start - Start byte of the initialization range.
 * @property {string} initRange.end - End byte of the initialization range.
 * @property {?Object} indexRange - Byte range for the index segment.
 * @property {string} indexRange.start - Start byte of the index range.
 * @property {string} indexRange.end - End byte of the index range.
 * @property {?string} lastModified - The timestamp of the last modification in microseconds since the UNIX epoch.
 * @property {?string} contentLength - The total length of the content in bytes, or `null` if unknown.
 * @property {?string} quality - The quality string, e.g., `'tiny'`.
 * @property {?string} projectionType - The type of video projection, e.g., `'RECTANGULAR'`, or `null`.
 * @property {?number} averageBitrate - The average bitrate in bits per second (bps), or `null` if unknown.
 * @property {?boolean} highReplication - Indicates if the format uses high replication for streaming.
 * @property {?string} audioQuality - The audio quality label, e.g., `'AUDIO_QUALITY_MEDIUM'`, or `null` for video-only formats.
 * @property {string} approxDurationMs - The approximate duration of the format in milliseconds as a string.
 * @property {?string} audioSampleRate - The audio sample rate in Hertz as a string (e.g., `'44100'`), or `null`.
 * @property {?number} audioChannels - The number of audio channels, or `null` if unknown.
 * @property {?number} loudnessDb - The loudness level in decibels, or `null` if unavailable.
 * @property {boolean} hasVideo - Indicates whether the format includes a video track.
 * @property {boolean} hasAudio - Indicates whether the format includes an audio track.
 * @property {string} container - The container format, e.g., `'mp4'`.
 * @property {string} codecs - The combined codecs for audio and video or only one of them, e.g., `'mp4a.40.2'`.
 * @property {?string} videoCodec - The video codec, or `null` for audio-only formats.
 * @property {?string} audioCodec - The audio codec, or `null` for video-only formats.
 * @property {boolean} isLive - Indicates if the format is part of a live stream.
 * @property {boolean} isHLS - Indicates if the format is in HLS (HTTP Live Streaming) format.
 * @property {boolean} isDashMPD - Indicates if the format is in DASH (Dynamic Adaptive Streaming over HTTP) format.
 * @global
 * @since 2.0.0
 */

/**
 * @typedef  {YTFormatObject} ParsedYTFormatObject
 * @property {MIMEType} mimeType - MIMEType instance representing the media type.
 * @property {?Object} initRange - Byte range for the initialization segment.
 * @property {number} initRange.start - Parsed integer value of start byte of the initialization range.
 * @property {number} initRange.end - Parsed integer value of end byte of the initialization range.
 * @property {?Object} indexRange - Byte range for the index segment.
 * @property {number} indexRange.start - Parsed integer value of start byte of the index range.
 * @property {number} indexRange.end - Parsed integer value of end byte of the index range.
 * @property {?module:utils/info-utils~DateFormatter} lastModified - A {@link module:utils/info-utils~DateFormatter `DateFormatter`} instance created from the `lastModified` timestamp, or `null`.
 * @property {?number} contentLength - Parsed integer value of the content length.
 * @property {?number} approxDurationMs - Parsed integer value of the approximate duration in milliseconds.
 * @property {?number} audioSampleRate - Parsed integer value of the audio sample rate.
 * @global
 * @since 2.0.0
 */

'use strict';

const { MIMEType } = require('node:util');
const TypeUtils = require('./type-utils');
const { InvalidTypeError } = require('../error');

/**
 * Namespace for utility functions related to YouTube formats.
 * @namespace module:utils/info-utils~FormatUtils
 * @public
 * @since 2.0.0
 */
const FormatUtils = { };

class DateFormatter {
  /**
   * Constructs a `DateFormatter` instance with a given timestamp in milliseconds.
   *
   * @classdesc
   * A utility class for handling date and time formatting.
   *
   * This class allows converting timestamps (in milliseconds or microseconds) into various formats,
   * including ISO strings, human-readable strings, and locale-specific formats.
   * 
   * @param {number} ms - The timestamp in milliseconds since the UNIX epoch.
   * @throws {InvalidTypeError} If given `ms` is not a valid number.
   *
   * @class
   * @package
   * @since 2.0.0
   */
  constructor(ms) {
    if (typeof ms !== 'number') {
      throw new InvalidTypeError('Timestamp must be a number in milliseconds.', {
        actualType: TypeUtils.getType(ms),
        expectedType: 'number'
      });
    }

    this._microsecs = ms * 10e2;
    this._millisecs = Math.floor(ms);
    this._date = new Date(ms);
  }

  /**
   * Parse a timestamp in microseconds and return a {@link module:utils/info-utils~DateFormatter `DateFormatter`} instance.
   *
   * @param {number} microsecs - Timestamp in microseconds.
   * @returns {DateFormatter}
   *
   * @throws {InvalidTypeError} If the given timestamp is not a number.
   *
   * @static
   * @since 2.0.0
   */
  static fromMicroseconds(microsecs) {
    if (typeof microsecs !== 'number') {
      throw new InvalidTypeError('Timestamp must be a number in microseconds', {
        actualType: TypeUtils.getType(microsecs),
        expectedType: 'number'
      });
    }
    // Multiply by 1000 to convert to milliseconds,
    // but do not round the decimal values for later retrieval
    return new DateFormatter(microsecs / 10e2);
  }

  /**
   * Get the timestamp in microseconds.
   * @returns {number}
   *
   * @method
   * @since 2.0.0
   */
  toMicroseconds() {
    return this._microsecs;
  }

  /**
   * An alias method for {@link module:utils/info-utils~DateFormatter#toMicroseconds `DateFormatter#toMicroseconds`} method.
   * @returns {number}
   *
   * @method
   * @since 2.0.0
   */
  micros() {
    return this._microsecs;
  }

  /**
   * Get the timestamp in milliseconds.
   * @returns {number}
   *
   * @method
   * @since 2.0.0
   */
  toMilliseconds() {
    return this._millisecs;
  }

  /**
   * An alias method for {@link module:utils/info-utils~DateFormatter#toMilliseconds `DateFormatter#toMilliseconds`} method.
   * @returns {number}
   *
   * @method
   * @since 2.0.0
   */
  millis() {
    return this._millisecs;
  }

  /**
   * Get the ISO-8601 formatted date string.
   * @returns {string}
   *
   * @method
   * @since 2.0.0
   */
  toISOString() {
    return this._date.toISOString();
  }

  /**
   * An alias method for {@link module:utils/info-utils~DateFormatter#toISOString `DateFormatter#toISOString`} method.
   * @returns {string}
   *
   * @method
   * @since 2.0.0
   */
  toISO() {
    return this._date.toISOString();
  }

  /**
   * Get the `Date` object from this instance.
   * @returns {Date}
   *
   * @method
   * @since 2.0.0
   */
  toDateObject() {
    return this._date;
  }

  /**
   * Get the human-readable date string.
   * @returns {string}
   *
   * @method
   * @since 2.0.0
   */
  toString() {
    return this._date.toString();
  }

  /**
   * Get the date formatted to a specified locale.
   *
   * @param {string} [locale] - The locale string. Will default to system locale if not provided.
   * @param {Object} [options] - Formatting options for date time format.
   * @returns {string}
   *
   * @method
   * @since 2.0.0
   */
  toLocaleString(locale, options = {}) {
    if (!locale) locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return this._date.toLocaleString(locale, options);
  }
}


/**
 * Parses a YouTube format object and returns a new object with normalized and enhanced properties.
 *
 * This function ensures that the format object is properly structured, converts specific properties 
 * to more usable types (e.g., `mimeType` to an instance of `MIMEType`, `lastModified` to an instance 
 * of {@link module:utils/info-utils~DateFormatter `DateFormatter`}), and parses numeric string values into
 * integers for consistency.
 *
 * ### Transformation Details
 * - `mimeType`: Converted to a `MIMEType` instance.
 * - `initRange` and `indexRange`: Converted to objects with `start` and `end` properties as integers, 
 *                                 if they are valid plain objects.
 * - `lastModified`: Converted to a {@link module:utils/info-utils~DateFormatter `DateFormatter`} instance
 *                   based on the provided microsecond timestamp.
 * - `contentLength`, `approxDurationMs`, and `audioSampleRate`: Parsed into integers if originally strings.
 *
 * If a property is not defined or improperly formatted, the original value from the input object is retained.
 *
 * @param {YTFormatObject} fmtObj - The format object to parse. Must be a plain object with properties 
 *                                  matching the expected YouTube format structure.
 *
 * @throws {InvalidTypeError} Throws an error if the input is not a plain object.
 *
 * @returns {ParsedYTFormatObject} A new YouTube format object with normalized properties.
 *
 * @memberof module:utils/info-utils~FormatUtils
 * @public
 * @since 2.0.0
 */
function parseFormatObject(fmtObj) {
  if (!TypeUtils.isPlainObject(fmtObj)) {
    throw new InvalidTypeError('YouTube format object must be a plain object', {
      actualType: TypeUtils.getType(fmtObj),
      expectedType: TypeUtils.getType({})
    });
  }
  return Object.assign({}, fmtObj, {
    mimeType: new MIMEType(fmtObj.mimeType),
    initRange: TypeUtils.isPlainObject(fmtObj.initRange)
      ? {
        start: parseInt(fmtObj.initRange.start || '0', 10),
        end: parseInt(fmtObj.initRange.end || '0', 10)
      }
      : fmtObj.initRange,
    indexRange: TypeUtils.isPlainObject(fmtObj.indexRange)
      ? {
        start: parseInt(fmtObj.indexRange.start || '0', 10),
        end: parseInt(fmtObj.indexRange.end || '0', 10)
      }
      : fmtObj.indexRange,
    lastModified: typeof fmtObj.lastModified === 'string'
      ? DateFormatter.fromMicroseconds(parseInt(fmtObj.lastModified, 10))
      : fmtObj.lastModified,
    contentLength: typeof fmtObj.contentLength === 'string'
      ? parseInt(fmtObj.contentLength, 10) : fmtObj.contentLength,
    approxDurationMs: typeof fmtObj.approxDurationMs === 'string'
      ? parseInt(fmtObj.approxDurationMs, 10) : fmtObj.approxDurationMs,
    audioSampleRate: typeof fmtObj.audioSampleRate === 'string'
      ? parseInt(fmtObj.audioSampleRate, 10) : fmtObj.audioSampleRate
  });
}
FormatUtils.parseFormatObject = parseFormatObject;

/**
 * Determines if a given YouTube format object contains video content.
 *
 * @param {YTFormatObject | ParsedYTFormatObject} fmtObj - A YouTube format object.
 * @returns {boolean} `true` if contains video content, `false` otherwise.
 *
 * @memberof module:utils/info-utils~FormatUtils
 * @public
 * @since 2.0.0
 */
function hasVideo(fmtObj) {
  if (!TypeUtils.isPlainObject(fmtObj)) return false;
  return fmtObj.hasVideo && fmtObj.videoCodec !== null;
}
FormatUtils.hasVideo = hasVideo;

/**
 * Determines if a given YouTube format object contains audio content.
 *
 * @param {YTFormatObject | ParsedYTFormatObject} fmtObj - A YouTube format object.
 * @returns {boolean} `true` if contains audio content, `false` otherwise.
 *
 * @memberof module:utils/info-utils~FormatUtils
 * @public
 * @since 2.0.0
 */
function hasAudio(fmtObj) {
  if (!TypeUtils.isPlainObject(fmtObj)) return false;
  return fmtObj.hasAudio && fmtObj.audioCodec !== null;
}
FormatUtils.hasAudio = hasAudio;

module.exports = { DateFormatter, FormatUtils, ...FormatUtils };
