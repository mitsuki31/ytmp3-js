/**
 * @file A utility module that provides functions and classes for handling and processing
 *       YouTube video information and format objects, as well as date and time formatting utilities.
 *
 * This module enhances the usability of raw data retrieved from YouTube APIs by normalizing and transforming
 * specific properties into more user-friendly types and formats.
 *
 * ### Features
 * - **`DateFormatter` Class**: A utility for handling and formatting timestamps.
 * - **`FormatUtils` Namespace**: A collection of functions for working with YouTube format objects,
 *                                including parsing and determining media capabilities.
 * - **`InfoUtils` Namespace**: A collection of functions for extracting and normalizing various
 *                              properties from YouTube video information objects.
 *
 * @module    utils/info-utils
 * @requires  error
 * @requires  utils/type-utils
 * @author    Ryuu Mitsuki <{@link https://github.com/mitsuki31}>
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

/**
 * Represents the extracted and normalized author information.
 *
 * @typedef  {object} AuthorInfo
 * @property {string} name - The normalized author name.
 * @property {string} id - The author's unique ID.
 * @property {string} userUrl - The author's user profile URL.
 * @property {string} channelUrl - The author's channel URL.
 * @property {string} [externalChannelUrl] - The external URL linking to the author's channel.
 * @property {string} [username] - The author's YouTube username.
 * @property {ThumbnailObject[]} [thumbnails] - An array of thumbnail objects representing the author's profile images.
 * @property {boolean} verified - Whether the author is a verified YouTube user.
 * @property {number} [subscriberCount] - The number of subscribers the author has.
 *
 * @global
 * @since  2.0.0
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


// =========================
// region InfoUtils
// =========================

function validateVideoInfo(vInfo) {
  if (!TypeUtils.isPlainObject(vInfo)) {
    throw new InvalidTypeError('Video info must be an object', {
      actualType: TypeUtils.getType(vInfo),
      expectedType: TypeUtils.getType({})
    });
  }
}

/**
 * A namespace utility to working with YouTube video information object.
 *
 * @namespace module:utils/info-utils~InfoUtils
 * @public
 * @since     2.0.0
 */
const InfoUtils = {};

/**
 * Extracts and normalizes author information from the provided video info object.
 *
 * @param {ytdl.videoInfo} vInfo - The video information object.
 * @returns {AuthorInfo} An object containing normalized author details.
 *
 * @throws {InvalidTypeError} If the `vInfo` is not a plain object.
 *
 * @memberof module:utils/info-utils~InfoUtils
 * @public
 * @since    2.0.0
 */
function getAuthor(vInfo) {
  validateVideoInfo(vInfo);

  /**
   * Normalizes the author name by removing trailing whitespaces and
   * the '- Topic' suffix (if any).
   *
   * @param {string} name - The author name.
   * @returns {string} The normalized author name.
   * @private
   */
  function normalizeAuthorName(name) {
    if (!name) return name;
    return (/(.+) - Topic$/.exec(name) || [0, name])[1].replace(/\s{2,}/g, ' ');
  }

  const author = vInfo.videoDetails?.author;  // Safely extract the author object
  return {
    name: normalizeAuthorName(author?.name),
    id: author?.id,
    userUrl: author?.user_url?.replace(/^http:/, 'https:'),
    channelUrl: author?.channel_url?.replace(/^http:/, 'https:'),
    externalChannelUrl: author?.external_channel_url?.replace(/^http:/, 'https:'),
    username: author?.user,
    thumbnails: author?.thumbnails,
    verified: author?.verified,
    subscriberCount: author?.subscriber_count
  };
}
InfoUtils.getAuthor = getAuthor;

/**
 * Extracts and returns the title of the video from the provided video info object.
 *
 * @param {ytdl.videoInfo} vInfo - The video information object.
 * @returns {string | null} The title of the video, or `null` if not available.
 *
 * @throws {InvalidTypeError} If the `vInfo` is not a plain object.
 *
 * @memberof module:utils/info-utils~InfoUtils
 * @public
 * @since    2.0.0
 */
function getTitle(vInfo) {
  validateVideoInfo(vInfo);
  return vInfo.videoDetails?.title?.trim() || null;
}
InfoUtils.getTitle = getTitle;

/**
 * Extracts and returns the duration of a video in seconds.
 *
 * @param {ytdl.videoInfo} vInfo - The video information object.
 * @returns {number} The duration of the video in seconds. Returns 0 if the duration is not available.
 *
 * @throws {InvalidTypeError} If the `vInfo` is not a plain object.
 *
 * @memberof module:utils/info-utils~InfoUtils
 * @public
 * @since    2.0.0
 */
function getDuration(vInfo) {
  validateVideoInfo(vInfo);
  const duration = vInfo?.videoDetails?.lengthSeconds;
  return duration ? parseInt(duration, 10) : 0;
}
InfoUtils.getDuration = getDuration;

/**
 * Extracts and returns the upload date of the video.
 *
 * @param {ytdl.videoInfo} vInfo - The video information object.
 * @returns {string | null} The upload date of the video, or `null` if not available.
 *
 * @throws {InvalidTypeError} If the `vInfo` is not a plain object.
 *
 * @memberof module:utils/info-utils~InfoUtils
 * @public
 * @since    2.0.0
 */
function getUploadDate(vInfo) {
  validateVideoInfo(vInfo);
  return vInfo.videoDetails?.uploadDate || null;
}
InfoUtils.getUploadDate = getUploadDate;

/**
 * Extracts and returns the publish date of the video.
 *
 * @param {ytdl.videoInfo} vInfo - The video information object.
 * @returns {string | null} The publish date of the video, or `null` if not available.
 *
 * @throws {InvalidTypeError} If the `vInfo` is not a plain object.
 *
 * @memberof module:utils/info-utils~InfoUtils
 * @public
 * @since    2.0.0
 */
function getPublishDate(vInfo) {
  validateVideoInfo(vInfo);
  return vInfo.videoDetails?.publishDate || null;
}
InfoUtils.getPublishDate = getPublishDate;

/**
 * Extracts and returns the view count of the video.
 *
 * @param {Object} vInfo - The video information object.
 * @returns {number | null} The view count of the video, or `null` if not available.
 *
 * @throws {InvalidTypeError} If the `vInfo` is not a plain object.
 *
 * @memberof module:utils/info-utils~InfoUtils
 * @public
 * @since    2.0.0
 */
function getViewers(vInfo) {
  validateVideoInfo(vInfo);
  const count = vInfo?.videoDetails?.viewCount;
  return count ? parseInt(count, 10) : null;
}

/**
 * An alias for {@link module:utils/info-utils~InfoUtils.getViewers `getViewers`} function.
 *
 * It extracts the view count of the video, or returns `null` if the view count is not available.
 * 
 * @param {ytdl.videoInfo} vInfo - The video information object.
 * @returns {number | null} The view count of the video, or `null` if not available.
 *
 * @memberof module:utils/info-utils~InfoUtils
 * @public
 * @since    2.0.0
 */
function getViews(vInfo) { return getViewers(vInfo); };

InfoUtils.getViewers = getViewers;
InfoUtils.getViews = getViews;


/**
 * Extracts and returns the like count of the video.
 *
 * @param {ytdl.videoInfo} vInfo - The video information object.
 * @returns {number | null} The like count of the video, or `null` if not available.
 *
 * @throws {InvalidTypeError} If the `vInfo` is not a plain object.
 *
 * @memberof module:utils/info-utils~InfoUtils
 * @public
 * @since    2.0.0
 */
function getLikes(vInfo) {
  validateVideoInfo(vInfo);
  return vInfo.videoDetails?.likes || null;
}
InfoUtils.getLikes = getLikes;

/**
 * Extracts and returns the subscriber count of the video's author.
 *
 * @param {ytdl.videoInfo} vInfo - The video information object.
 * @returns {number | null} The subscriber count of the author, or `null` if not available.
 *
 * @throws {InvalidTypeError} If the `vInfo` is not a plain object.
 *
 * @memberof module:utils/info-utils~InfoUtils
 * @public
 * @since    2.0.0
 */
function getSubscribers(vInfo) {
  validateVideoInfo(vInfo);
  return vInfo.videoDetails?.author?.subscriber_count || null;
}

/**
 * An alias for {@link module:utils/info-utils~InfoUtils.getSubscribers `getSubscribers`} function.
 *
 * It extracts the subscriber count of the video's author, or returns `null` if the subscriber count is not available.
 * 
 * @param {ytdl.videoInfo} vInfo - The video information object.
 * @returns {number | null} The subscriber count of the video, or `null` if not available.
 *
 * @memberof module:utils/info-utils~InfoUtils
 * @static
 * @public
 * @since    2.0.0
 */
function getSubs(vInfo) { return getSubscribers(vInfo); };

InfoUtils.getSubscribers = getSubscribers;
InfoUtils.getSubs = getSubs;


/**
 * Extracts and returns the description of the video.
 *
 * @param {ytdl.videoInfo} vInfo - The video information object.
 * @returns {string | null} The description of the video, or `null` if not available.
 *
 * @throws {InvalidTypeError} If the `vInfo` is not a plain object.
 *
 * @memberof module:utils/info-utils~InfoUtils
 * @public
 * @since    2.0.0
 */
function getDescription(vInfo) {
  validateVideoInfo(vInfo);
  return vInfo.videoDetails?.description?.trim() || null;
}
InfoUtils.getDescription = getDescription;

/**
 * Extracts and returns the keywords of the video.
 *
 * @param {ytdl.videoInfo} vInfo - The video information object.
 * @returns {string[]} An array of keywords, or an empty array if not available.
 *
 * @throws {InvalidTypeError} If the `vInfo` is not a plain object.
 *
 * @memberof module:utils/info-utils~InfoUtils
 * @public
 * @since    2.0.0
 */
function getKeywords(vInfo) {
  validateVideoInfo(vInfo);
  return Array.isArray(vInfo.videoDetails?.keywords) ? vInfo.videoDetails.keywords : [];
}
InfoUtils.getKeywords = getKeywords;

/**
 * Extracts and returns the available formats of the video, optionally filtered by type.
 *
 * ### Filter Types
 * |            Name            |                            Description                            |
 * | -------------------------- | ----------------------------------------------------------------- |
 * | `'all'`                    | Returns all the video formats and pass the filtering process.     |
 * | `'both'`                   | Returns the video formats that have both video and audio content. |
 * | `'audio'` \| `'audioonly'` | Returns the video formats that have audio content only.           |
 * | `'video'` \| `'videoonly'` | Returns the video formats that have video content only.           |
 *
 * @param {ytdl.videoInfo} vInfo - The video information object.
 * @param {'all' | 'both' | 'audio' | 'audioonly' | 'video' | 'videoonly'} [filter='all'] - The filter type.
 *
 * @returns {YTFormatObject[]} An array of format objects.
 *
 * @throws {InvalidTypeError} If the `vInfo` is not a plain object or the filter type is invalid.
 *
 * @memberof module:utils/info-utils~InfoUtils
 * @public
 * @since    2.0.0
 */
function getFormats(vInfo, filter) {
  validateVideoInfo(vInfo);

  filter = typeof filter === 'undefined' ? 'all' : filter;
  if (typeof filter !== 'string'
      || !['all', 'both', 'audio', 'audioonly', 'video', 'videoonly'].includes(filter)) {
    throw new InvalidTypeError('Invalid filter type', {
      actualType: typeof filter === 'string' ? filter : TypeUtils.getType(filter),
      expectedType: "'all' | 'both' | 'audio' | 'audioonly' | 'video' | 'videoonly'"
    });
  }

  const formats = Array.isArray(vInfo.formats) ? vInfo.formats : [];
  if (!formats.length || filter === 'all') return formats;

  let filteredFormats = [];
  if (['audio', 'audioonly'].includes(filter)) {
    filteredFormats = formats.filter(format => hasAudio(format) && !hasVideo(format));
  } else if (['video', 'videoonly'].includes(filter)) {
    filteredFormats = formats.filter(format => !hasAudio(format) && hasVideo(format));
  } else if (filter === 'both') {
    // It is different between 'all' and 'both' filter type, 'all' will return entire formats
    // without filtering the formats first, whereas the 'both' will filter the formats that contains
    // both audio and video content
    filteredFormats = formats.filter(format => hasAudio(format) && hasVideo(format));
  }

  return filteredFormats;
}
InfoUtils.getFormats = getFormats;

/**
 * Extracts and returns the category of the video.
 *
 * @param {ytdl.videoInfo} vInfo - The video information object.
 * @returns {string | null} The category of the video, or `null` if not available.
 *
 * @throws {InvalidTypeError} If the `vInfo` is not a plain object.
 *
 * @memberof module:utils/info-utils~InfoUtils
 * @public
 * @since    2.0.0
 */
function getCategory(vInfo) {
  validateVideoInfo(vInfo);
  return vInfo.videoDetails?.category || null;
}
InfoUtils.getCategory = getCategory;

/**
 * Extracts and returns the available captions of the video.
 *
 * @param {ytdl.videoInfo} vInfo - The video information object.
 * @returns {object[]} An array of caption track objects.
 *
 * @throws {InvalidTypeError} If the `vInfo` is not a plain object.
 *
 * @memberof module:utils/info-utils~InfoUtils
 * @public
 * @since    2.0.0
 */
function getCaptions(vInfo) {
  validateVideoInfo(vInfo);
  return Array.isArray(
    vInfo.player_response?.captions?.playerCaptionsTracklistRenderer?.captionTracks
  ) ? vInfo.player_response.captions.playerCaptionsTracklistRenderer.captionTracks : [];
}
InfoUtils.getCaptions = getCaptions;

/**
 * Checks whether the video content from the given video info is private.
 *
 * @param {ytdl.videoInfo} vInfo - The video information object.
 * @returns {boolean} `true` if the video content is private, `false` otherwise.
 *
 * @memberof module:utils/info-utils~InfoUtils
 * @public
 * @since    2.0.0 
 */
function isPrivate(vInfo) {
  validateVideoInfo(vInfo);
  return typeof vInfo?.videoDetails?.isPrivate === 'boolean'
    ? vInfo.videoDetails.isPrivate : false;
}
InfoUtils.isPrivate = isPrivate;

/**
 * Checks whether the video content from the given video info have age-restriction.
 *
 * @param {ytdl.videoInfo} vInfo - The video information object.
 * @returns {boolean} `true` if the video content is age-restricted, `false` otherwise.
 *
 * @memberof module:utils/info-utils~InfoUtils
 * @public
 * @since    2.0.0
 */
function isAgeRestricted(vInfo) {
  validateVideoInfo(vInfo);
  return typeof vInfo.videoDetails.age_restricted === 'boolean'
    ? vInfo.videoDetails.age_restricted : false;
}
InfoUtils.isAgeRestricted = isAgeRestricted;


module.exports = {
  DateFormatter,
  FormatUtils,
  InfoUtils,
  ...FormatUtils,
  ...InfoUtils
};
