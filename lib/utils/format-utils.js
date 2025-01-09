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
 * @module    utils/format-utils
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
 * @property {?module:utils/format-utils~DateFormatter} lastModified - A {@link module:utils/format-utils~DateFormatter `DateFormatter`} instance created from the `lastModified` timestamp, or `null`.
 * @property {?number} contentLength - Parsed integer value of the content length.
 * @property {?number} approxDurationMs - Parsed integer value of the approximate duration in milliseconds.
 * @property {?number} audioSampleRate - Parsed integer value of the audio sample rate.
 * @global
 * @since 2.0.0
 */

/**
 * @typedef {Object} VideoThumbnailObject
 * @property {string} url - The URL of the video thumbnail image.
 * @property {number} width - The width of the video thumbnail image in pixels.
 * @property {number} height - The height of the video thumbnail image in pixels.
 * @global
 * @since 2.0.0
 */

/**
 * @typedef {Object} AuthorThumbnailObject
 * @property {string} url - The URL of the author's thumbnail image.
 * @property {number} width - The width of the thumbnail image in pixels.
 * @property {number} height - The height of the thumbnail image in pixels.
 * @global
 * @since 2.0.0
 */

/**
 * @typedef {Object} ThumbnailObject
 * @property {string} url - The URL of the thumbnail image.
 * @property {number} width - The width of the thumbnail image in pixels.
 * @property {number} height - The height of the thumbnail image in pixels.
 * @global
 * @since 2.0.0
 */

/**
 * An object containing arrays of author and video thumbnail objects.
 * Typically returned by the {@link module:utils/format-utils~FormatUtils.getThumbnails `getThumbnails`} function.
 *
 * @typedef {Object} AllThumbnailsObject
 * @property {Array.<AuthorThumbnailObject>} author - An array of author thumbnail objects or an empty array if not available.
 * @property {Array.<VideoThumbnailObject>} video - An array of video thumbnail objects or an empty array if not available.
 * @global
 * @since 2.0.0
 */

'use strict';

const { MIMEType } = require('node:util');
const TypeUtils = require('./type-utils');
const { InvalidTypeError } = require('../error');

/**
 * Namespace for utility functions related to YouTube formats.
 * @namespace module:utils/format-utils~FormatUtils
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
   * Parse a timestamp in microseconds and return a {@link module:utils/format-utils~DateFormatter `DateFormatter`} instance.
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
   * An alias method for {@link module:utils/format-utils~DateFormatter#toMicroseconds `DateFormatter#toMicroseconds`} method.
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
   * An alias method for {@link module:utils/format-utils~DateFormatter#toMilliseconds `DateFormatter#toMilliseconds`} method.
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
   * An alias method for {@link module:utils/format-utils~DateFormatter#toISOString `DateFormatter#toISOString`} method.
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
 * of {@link module:utils/format-utils~DateFormatter `DateFormatter`}), and parses numeric string values into
 * integers for consistency.
 *
 * ### Transformation Details
 * - `mimeType`: Converted to a `MIMEType` instance.
 * - `initRange` and `indexRange`: Converted to objects with `start` and `end` properties as integers, 
 *                                 if they are valid plain objects.
 * - `lastModified`: Converted to a {@link module:utils/format-utils~DateFormatter `DateFormatter`} instance
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
 * @memberof module:utils/format-utils~FormatUtils
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
 * @memberof module:utils/format-utils~FormatUtils
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
 * @memberof module:utils/format-utils~FormatUtils
 * @public
 * @since 2.0.0
 */
function hasAudio(fmtObj) {
  if (!TypeUtils.isPlainObject(fmtObj)) return false;
  return fmtObj.hasAudio && fmtObj.audioCodec !== null;
}
FormatUtils.hasAudio = hasAudio;

// region Thumbnail Utilities

/**
 * Sorts an array of thumbnail objects by their resolution in ascending order.
 * 
 * Each thumbnail object is expected to have `width` and `height` properties.
 * The resolution of a thumbnail is calculated as the product of its width and height.
 * 
 * @param {Array.<(AuthorThumbnailObject | VideoThumbnailObject)>} thumbnails
 *        An array of thumbnail objects to be sorted.
 * @returns {Array.<(AuthorThumbnailObject | VideoThumbnailObject)>}
 *        A new array of thumbnail objects sorted by resolution in ascending order.
 * 
 * @throws {InvalidTypeError} If the input is not an array of thumbnail objects.
 *
 * @memberof module:utils/format-utils~FormatUtils
 * @public
 * @since 2.0.0
 */
function sortThumbnailsByResolution(thumbnails) {
  if (!Array.isArray(thumbnails)) {
    throw new InvalidTypeError('Thumbnails must be an array of thumbnail objects', {
      actualType: TypeUtils.getType(thumbnails),
      expectedType: TypeUtils.getType([])
    });
  }
  return [...thumbnails].sort((a, b) => {
    const resolutionA = a.width * a.height;
    const resolutionB = b.width * b.height;
    return resolutionA - resolutionB;
  });
}
FormatUtils.sortThumbnailsByResolution = sortThumbnailsByResolution;

/**
 * Retrieves the author's thumbnails from the provided video details object and
 * optionally sorts the thumbnails by resolution.
 *
 * @param {ytdl.videoDetails} videoDetails - The video details object containing author information,
 *                                           retrieved from `ytdl.getInfo()` or {@link module:ytmp3~getVideosInfo `ytmp3.getVideosInfo()`}.
 * @param {boolean} [sort=true] - Whether to sort the thumbnails by resolution. Defaults to `true`.
 *
 * @returns {Array.<AuthorThumbnailObject>} An array of author thumbnails, optionally sorted by resolution.
 *                                          If no thumbnails are found, an empty array is returned.
 *
 * @throws {InvalidTypeError} If the provided `videoDetails` is not a plain object.
 *
 * @memberof module:utils/format-utils~FormatUtils
 * @public
 * @since 2.0.0
 */
function getAuthorThumbnails(videoDetails, sort=true) {
  if (!TypeUtils.isPlainObject(videoDetails)) {
    throw new InvalidTypeError('Invalid `videoDetails` object type', {
      actualType: TypeUtils.getType(videoDetails),
      expectedType: TypeUtils.getType({})
    });
  }
  const authorThumbnails = TypeUtils.isPlainObject(videoDetails.author)
      && Array.isArray(videoDetails.author.thumbnails)
    ? videoDetails.author.thumbnails
    : [];
  return (!sort) ? authorThumbnails : sortThumbnailsByResolution(authorThumbnails);
}
FormatUtils.getAuthorThumbnails = getAuthorThumbnails;

/**
 * Retrieves the video thumbnails from the provided video details object and
 * optionally sorts the thumbnails by resolution.
 *
 * @param {ytdl.videoDetails} videoDetails - The video details object containing video information,
 *                                           retrieved from `ytdl.getInfo()` or {@link module:ytmp3~getVideosInfo `ytmp3.getVideosInfo()`}.
 * @param {boolean} [sort=true] - Whether to sort the thumbnails by resolution. Defaults to `true`.
 *
 * @returns {Array.<VideoThumbnailObject>} An array of video thumbnails, optionally sorted by resolution.
 *                                         If no thumbnails are found, returns an empty array.
 *
 * @throws {InvalidTypeError} If the provided `videoDetails` is not a plain object.
 *
 * @memberof module:utils/format-utils~FormatUtils
 * @public
 * @since 2.0.0
 */
function getVideoThumbnails(videoDetails, sort=true) {
  if (!TypeUtils.isPlainObject(videoDetails)) {
    throw new InvalidTypeError('Invalid `videoDetails` object type', {
      actualType: TypeUtils.getType(videoDetails),
      expectedType: TypeUtils.getType({})
    });
  }
  const videoThumbnails = Array.isArray(videoDetails.thumbnails)
    ? videoDetails.thumbnails
    : [];
  return (!sort) ? videoThumbnails : sortThumbnailsByResolution(videoThumbnails);
}
FormatUtils.getVideoThumbnails = getVideoThumbnails;

/**
 * Retrieves all thumbnails for a video, including the author and video thumbnails,
 * and optionally sorts the thumbnails by resolution.
 *
 * @param {ytdl.videoDetails} videoDetails - The details of the video containing author and video information,
 *                                          retrieved from `ytdl.getInfo()` or {@link module:ytmp3~getVideosInfo `ytmp3.getVideosInfo()`}.
 * @param {boolean} [sort=true] - Whether to sort the thumbnails by resolution. Defaults to `true`.
 *
 * @returns {AllThumbnailsObject} An object containing all thumbnails including author and video thumbnails,
 *                                and optionally sorted by resolution.
 *
 * @throws {InvalidTypeError} If the provided `videoDetails` is not a plain object.
 *
 * @memberof module:utils/format-utils~FormatUtils
 * @public
 * @since 2.0.0
 */
function getAllThumbnails(videoDetails, sort=true) {
  if (!TypeUtils.isPlainObject(videoDetails)) {
    throw new InvalidTypeError('Invalid `videoDetails` object type', {
      actualType: TypeUtils.getType(videoDetails),
      expectedType: TypeUtils.getType({})
    });
  }

  return {
    author: getAuthorThumbnails(videoDetails, sort),
    video: getVideoThumbnails(videoDetails, sort)
  };
}
FormatUtils.getAllThumbnails = getAllThumbnails;

/**
 * Retrieves a thumbnail based on the desired resolution level.
 *
 * ### Resolution Level
 * - `low`: Corresponds to `hqdefault` thumbnail.
 * - `medium`: Corresponds to `mqdefault` thumbnail.
 * - `high`: Prioritizes the `maxresdefault` thumbnail if available, otherwise falls back to `sddefault`.
 * - `max`: Corresponds to `maxresdefault` thumbnail if available, otherwise return `null`.
 *
 * @note It is recommended to use `'high'` to have a fallback value in case the `maxresdefault` is unavailable.
 *
 * @param {Array.<VideoThumbnailObject | AuthorThumbnailObject>} thumbnails - An array of thumbnail objects.
 * @param {'low' | 'medium' | 'high' | 'max'} resolutionType - Desired resolution level type.
 *
 * @returns {ThumbnailObject | null} Thumbnail object matching the desired resolution, or `null` if
 *                                   the desired thumbnail is unavailable.
 *
 * @throws {InvalidTypeError} If the resolution type is invalid.
 *
 * @memberof module:utils/format-utils~FormatUtils
 * @public
 * @since 2.0.0
 */
function getThumbnailByResolution(thumbnails, resolutionType) {
  if (!resolutionType || !(['low', 'medium', 'high', 'max'].includes(resolutionType))) {
    throw new InvalidTypeError('Invalid resolution type. Use \'low\', \'medium\', \'high\', or \'max\'', {
      actualType: typeof resolutionType === 'string' ? resolutionType : TypeUtils.getType(resolutionType),
      expectedType: '\'low\' | \'medium\' | \'high\' | \'max\''
    });
  }

  if (!Array.isArray(thumbnails)) {
    throw new InvalidTypeError('Thumbnails must be an array of thumbnail objects', {
      actualType: TypeUtils.getType(thumbnails),
      expectedType: TypeUtils.getType([])
    });
  }

  // Get the sorted thumbnails for easier processing
  const sortedThumbnails = sortThumbnailsByResolution(thumbnails);
  let thumbnail = null;

  // Mapping of resolution keys to thumbnail identifiers
  const resolutionMapping = {
    low: 'hqdefault',
    medium: 'mqdefault',
    high: ['maxresdefault', 'sddefault'], // high has a fallback to sddefault
    max: 'maxresdefault',
  };

  // Handle high resolution fallback
  const targetKeys = resolutionMapping[resolutionType];
  if (Array.isArray(targetKeys)) {
    for (const key of targetKeys) {
      if (!thumbnail) {
        thumbnail = sortedThumbnails.find((thumb) => thumb.url.includes(key));
      }
    }
  }
  // Standard resolution lookup
  thumbnail = thumbnail
    || sortedThumbnails.find((thumb) => thumb.url.includes(targetKeys));

  // If the thumbnail is still not found, handle the case where the thumbnail is an author thumbnail
  if (!thumbnail &&
    Object.values(sortedThumbnails).some(t => t.width === t.height
      || /=s[0-9]+(x[0-9]+)?/.test(t.url))
  ) {
    // The author thumbnail has a square resolution and may contain size parameters in the URL
    if (resolutionType === 'max') resolutionType = 'high';  // Change the resolution type to 'high'
    const resolutionIndex = { low: 0, medium: 1, high: 2 };
    thumbnail = sortedThumbnails[resolutionIndex[resolutionType]] || null;
  }

  return thumbnail || null;
}
FormatUtils.getThumbnailByResolution = getThumbnailByResolution;

/**
 * Alias for {@link module:utils/format-utils~FormatUtils.getThumbnailByResolution `FormatUtils.getThumbnailByResolution`}.
 *
 * A bit different from `getThumbnailByResolution`, this function will use `'high'` as the default resolution type if not provided.
 * This resolution type prioritizes the `'maxresdefault'` thumbnail if available, otherwise falls back to 'sddefault'.
 *
 * ### Resolution Level
 * - `low`: Corresponds to `hqdefault` thumbnail.
 * - `medium`: Corresponds to `mqdefault` thumbnail.
 * - `high`: Prioritizes the `maxresdefault` thumbnail if available, otherwise falls back to `sddefault`.
 * - `max`: Corresponds to `maxresdefault` thumbnail if available, otherwise return `null`.
 *
 * @note It is recommended to use `'high'` to have a fallback value in case the `maxresdefault` is unavailable.
 *
 * @param {Array.<VideoThumbnailObject | AuthorThumbnailObject>} thumbnails - An array of thumbnail objects.
 * @param {'low' | 'medium' | 'high' | 'max'} [resolutionType] - Desired resolution level type.
 *
 * @returns {ThumbnailObject | null} Thumbnail object matching the desired resolution, or `null` if
 *                                   the desired thumbnail is unavailable.
 *
 * @throws {InvalidTypeError} If the resolution type is invalid.
 *
 * @memberof module:utils/format-utils~FormatUtils
 * @public
 * @since 2.0.0
 */
function getThumbnail(thumbnails, resolutionType) {
  // If the `resolutionType` is not provided, default to 'high' but prioritize the 'maxresdefault'
  if (TypeUtils.isNullOrUndefined(resolutionType)) resolutionType = 'high';
  return getThumbnailByResolution(thumbnails, resolutionType);
}
FormatUtils.getThumbnail = getThumbnail;


module.exports = { DateFormatter, FormatUtils, ...FormatUtils };
