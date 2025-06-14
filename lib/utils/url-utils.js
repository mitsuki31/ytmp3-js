/**
 * A submodule provides utilities for working with YouTube URLs.
 *
 * @module    utils/url-utils
 * @author    Ryuu Mitsuki <{@link https://github.com/mitsuki31}>
 * @license   MIT
 * @since     1.1.0
 */

'use strict';

const { isNullOrUndefined, getType } = require('./type-utils');
const {
  IDExtractorError,
  InvalidTypeError,
  UnknownYouTubeDomainError,
} = require('../error');


/**
 * @classdesc A static class that contains utilities for working with YouTube URLs.
 *
 * @class
 * @hideconstructor
 * @public
 * @since   1.1.0
 */
function URLUtils() {
  throw new Error('Cannot create new instance of static class');
}

/**
 * A list containing valid known YouTube domains.
 *
 * @type {Readonly<string[]>}
 * @static
 * @readonly
 * @public
 */
URLUtils.VALID_YOUTUBE_DOMAINS = Object.freeze([
  // ! NOTE: Any modification that affecting list orders will
  // !       need to update the `BASIC_YOUTUBE_DOMAINS` property.
  'www.youtube.com',     // Normal
  'm.youtube.com',       // Normal (typically in YouTube mobile)
  'youtube.com',         // Alternative (but will be redirected)
  'youtubekids.com',     // YouTube Kids
  'music.youtube.com',   // YouTube Music
  'gaming.youtube.com',  // YouTube Gaming
  'youtu.be'             // Shortened
]);

/**
 * A list containing YouTube domains that basically most used for downloading.
 *
 * @type {Readonly<string[]>}
 * @static
 * @readonly
 * @public
 * @see      {@link module:url-utils~URLUtils.VALID_YOUTUBE_DOMAINS URLUtils.VALID_YOUTUBE_DOMAINS}
 */
URLUtils.BASIC_YOUTUBE_DOMAINS = Object.freeze([
  ...URLUtils.VALID_YOUTUBE_DOMAINS.slice(0, 3),
  URLUtils.VALID_YOUTUBE_DOMAINS[4],
  URLUtils.VALID_YOUTUBE_DOMAINS[URLUtils.VALID_YOUTUBE_DOMAINS.length - 1]
]);

/**
 * Maximum length of YouTube video ID.
 *
 * According to YouTube API documentation V3, the `videoId` is a string but
 * does not specified about the length of video IDs was used. However, communities
 * says that YouTube video IDs have:
 *
 * - Exactly 11 characters.
 * - Allowed characters and symbols: `[A-Za-z0-9_-]`
 *
 * More details: <https://webapps.stackexchange.com/a/101153>
 *
 * @type {number}
 * @static
 * @readonly
 * @default
 */
URLUtils.MAX_ID_LENGTH = 0x0B;

/**
 * A regular expression for matching the YouTube video ID.
 *
 * This regular expression will match exactly 11 characters and can be more.
 * If you want strictly parse the YouTube video ID, use {@link
 * module:url-utils~URLUtils.VIDEO_ID_STRICT_REGEX `VIDEO_ID_STRICT_REGEX`} instead.
 *
 * @type {RegExp}
 * @static
 * @readonly
 * @see      {@link module:url-utils~URLUtils.VIDEO_ID_STRICT_REGEX URLUtils.VIDEO_ID_STRICT_REGEX}
 * @see      {@link module:url-utils~URLUtils.MAX_ID_LENGTH URLUtils.MAX_ID_LENGTH}
 */
URLUtils.VIDEO_ID_REGEX = new RegExp(`[A-Za-z0-9_-]{${URLUtils.MAX_ID_LENGTH}}`);

/**
 * A regular expression for strictly matching the YouTube video ID.
 *
 * @type {RegExp}
 * @static
 * @readonly
 * @see      {@link module:url-utils~URLUtils.VIDEO_ID_REGEX URLUtils.VIDEO_ID_REGEX}
 * @see      {@link module:url-utils~URLUtils.MAX_ID_LENGTH URLUtils.MAX_ID_LENGTH}
 */
URLUtils.VIDEO_ID_STRICT_REGEX = new RegExp(`^[A-Za-z0-9_-]{${URLUtils.MAX_ID_LENGTH}}$`);

/**
 * A regular expression for matching the YouTube video (excluding video ID).
 *
 * @type {RegExp}
 * @static
 * @readonly
 * @see      {@link module:url-utils~URLUtils.YTURL_WITH_ID_REGEX URLUtils.YTURL_WITH_ID_REGEX}
 * @see      {@link module:url-utils~URLUtils.BASIC_YOUTUBE_DOMAINS URLUtils.BASIC_YOUTUBE_DOMAINS}
 */
URLUtils.YTURL_REGEX = new RegExp(`^https?:\\/\\/(${
  URLUtils.BASIC_YOUTUBE_DOMAINS.reduce((acc, val) => {
    val = val.replace(/\./g, '\\.');
    acc += !(acc.length || 0) ? val : `|${val}`;
    acc += (val !== 'youtu\\.be') ? '\\/watch\\?v=' : '\\/?';
    return acc;
  }, '')
})`);

/**
 * A regular expression for matching the YouTube video.
 *
 * @type {RegExp}
 * @static
 * @readonly
 * @see      {@link module:url-utils~URLUtils.YTURL_REGEX URLUtils.YTURL_REGEX}
 * @see      {@link module:url-utils~URLUtils.BASIC_YOUTUBE_DOMAINS URLUtils.BASIC_YOUTUBE_DOMAINS}
 */
URLUtils.YTURL_WITH_ID_REGEX = new RegExp(
  `${URLUtils.YTURL_REGEX.source.replace(/\?\)$/, ')')}${URLUtils.VIDEO_ID_REGEX.source}`
);

/**
 * Extracts the YouTube video ID from given YouTube URL.
 *
 * The YouTube video ID have exactly 11 characters with allowed
 * symbols are `A-Z`, `a-z`, `0-9`, `_`, and `-`.
 *
 * Allowed YouTube domains to extract:
 *   - `www.youtube.com`
 *   - `m.youtube.com`
 *   - `youtube.com`
 *   - `youtu.be`
 *   - `music.youtube.com`
 *
 * @param {string | URL} url - The YouTube URL to evaluate.
 * @returns {string} A string with 11 characters representing the YouTube video ID.
 *
 * @throws {InvalidTypeError} If the given YouTube URL is neither a string nor `URL` object.
 * @throws {UnknownYouTubeDomainError} If the host name or domain name of given
 *                                     YouTube URL is unknown YouTube video domain.
 * @throws {IDExtractorError} If the extractor unable to extract the video ID,
 *                            this can be happen due to incorrect YouTube URL.
 *
 * @static
 * @public
 */
URLUtils.extractVideoId = function (url) {
  url = (typeof url === 'string') ? String.prototype.trim.apply(url) : url;
  if (isNullOrUndefined(url)
      // Only accept a URL with type either of string or URL object
      || (url && typeof url !== 'string')
      && (url && !(url instanceof URL))
  ) {
    throw new InvalidTypeError('Given YouTube URL is invalid type', {
      actualType: getType(url),
      expectedType: `string | ${getType(new URL('https://youtube.com'))}`  // string | [object URL]
    });
  }

  let parsedUrl;
  let videoId;
  try {
    parsedUrl = (url instanceof URL) ? url : new URL(url);
  } catch (err) {
    // Throw back with InvalidTypeError error instance if it is TypeError
    if (err instanceof TypeError) throw new InvalidTypeError(err);
    throw err;  // Otherwise, throw without any instance change
  }

  // Throw if the host name is not a valid YouTube domain
  if (!isNullOrUndefined(parsedUrl.hostname)
      && !URLUtils.VALID_YOUTUBE_DOMAINS.includes(parsedUrl.hostname)) {
    throw new UnknownYouTubeDomainError(
      `Unknown YouTube video domain: \x1b[33m${parsedUrl.hostname}\x1b[0m`
    );
  }

  if (URLUtils.YTURL_WITH_ID_REGEX.test(url)) {
    videoId = parsedUrl.searchParams.get('v');  // can be null
  }

  if (isNullOrUndefined(videoId)) {
    const paths = parsedUrl.pathname.split('/');
    videoId = (parsedUrl.hostname === 'youtu.be') ? paths[1] : paths[2];
  }

  // If still no video ID, throw an error
  if (isNullOrUndefined(videoId) || !URLUtils.validateId(videoId)) {
    throw new IDExtractorError(
      `Unable to extract video ID from URL: \x1b[33m${url}\x1b[0m`
    );
  }

  return videoId;
};

/**
 * Validates the given YouTube video ID.
 *
 * @param {string} id - The video ID to validate.
 * @returns {boolean} `true` if the given ID correctly represents
 *                    the YouTube video ID; otherwise `false`.
 *
 * @throws {InvalidTypeError} If the given YouTube video ID is not a string.
 *
 * @static
 * @public
 */
URLUtils.validateId = function (id) {
  id = (typeof id === 'string') ? String.prototype.trim.apply(id) : id;
  if (isNullOrUndefined(id) || typeof id !== 'string') {
    throw new InvalidTypeError('Video ID must be a string', {
      actualType: getType(id),
      expectedType: 'string'
    });
  }
  return URLUtils.VIDEO_ID_STRICT_REGEX.test(id);
};

/**
 * Validates the given YouTube URL and optionally validates its video ID.
 *
 * @param {string | URL} url - The YouTube URL to validate.
 * @param {boolean} [withId=true] - Whether to also validate the video ID within the URL.
 *                                  If `false`, the function will only validate the URL's domain name.
 * @returns {boolean} `true` if the given URL is a valid YouTube URL; otherwise `false`.
 *
 * @throws {InvalidTypeError} If the given YouTube URL is neither a string nor `URL` object.
 *
 * @static
 * @public
 */
URLUtils.validateUrl = function (url, withId=true) {
  url = (typeof url === 'string') ? String.prototype.trim.apply(url) : url;
  if (isNullOrUndefined(url) || (typeof url !== 'string' && !(url instanceof URL))) {
    throw new InvalidTypeError('Given YouTube URL is invalid type', {
      actualType: getType(url),
      expectedType: `string | ${getType(new URL('https://youtube.com'))}`  // string | URL
    });
  }

  let result = false;
  let parsedUrl;
  try {
    parsedUrl = (url instanceof URL) ? url : new URL(url);
  // eslint-disable-next-line no-unused-vars
  } catch (_) {
    // No error thrown even if the URL is malformed
    result = false;
  }

  result = URLUtils.YTURL_REGEX.test(url);
  if (withId) {
    try {
      result = result && !!URLUtils.extractVideoId(parsedUrl);
    // eslint-disable-next-line no-unused-vars
    } catch (_) {
      result = result && false;
    }
  }

  return result;
};

module.exports = URLUtils;
