/**
 * A submodule provides utilities for working with YouTube URLs.
 *
 * @module    utils/url-utils
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     1.1.0
 */

import { TypeUtils } from "#/vendor/type-utils";
import {
  IDExtractorError,
  InvalidTypeError,
  UnknownYouTubeDomainError,
} from '#error';


/**
 * A type that represents a string or `URL` object.
 * @since 5.0.0
 */
export type URLLike = string | URL;

/**
 * A static class that contains utilities for working with YouTube URLs.
 *
 * @internal
 * @since    1.1.0
 */
export
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class URLUtils {
  /**
   * A list containing valid known YouTube domains.
   *
   * @internal
   */
  static VALID_YOUTUBE_DOMAINS = [
    'www.youtube.com',     // Normal
    'm.youtube.com',       // Normal (typically in YouTube mobile)
    'youtube.com',         // Alternative (but will be redirected)
    'youtubekids.com',     // YouTube Kids
    'music.youtube.com',   // YouTube Music
    'gaming.youtube.com',  // YouTube Gaming
    'youtu.be'             // Shortened
  ] as const;

  /**
   * A list containing YouTube domains that basically most used for fetching YouTube videos.
   *
   * @internal
   * @see      {@link URLUtils.VALID_YOUTUBE_DOMAINS}
   */
  static BASIC_YOUTUBE_DOMAINS = [
    'youtube.com',         // Normal
    'www.youtube.com',     // Normal
    'm.youtube.com',       // Normal (typically in YouTube mobile)
    'music.youtube.com',   // YouTube Music
    'youtu.be'             // Shortened
  ] as const;

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
   * @default  0x0B (11)
   * @internal
   */
  static MAX_ID_LENGTH = 0x0B as const;

  /**
   * A regular expression for matching the YouTube video ID.
   *
   * This regular expression will match exactly 11 characters and can be more.
   * If you want strictly parse the YouTube video ID, use {@link URLUtils.VIDEO_ID_STRICT_REGEX} instead.
   *
   * @internal
   * @see {@link URLUtils.VIDEO_ID_STRICT_REGEX}
   * @see {@link URLUtils.MAX_ID_LENGTH}
   */
  static VIDEO_ID_REGEX = new RegExp(`[A-Za-z0-9_-]{${URLUtils.MAX_ID_LENGTH}}`);

  /**
   * A regular expression for strictly matching the YouTube video ID.
   *
   * @internal
   * @see {@link URLUtils.VIDEO_ID_REGEX}
   * @see {@link URLUtils.MAX_ID_LENGTH}
   */
  static VIDEO_ID_STRICT_REGEX = new RegExp(`^[A-Za-z0-9_-]{${URLUtils.MAX_ID_LENGTH}}$`);

  /**
   * A regular expression for matching the YouTube video (excluding video ID).
   *
   * @internal
   * @see {@link URLUtils.YTURL_WITH_ID_REGEX}
   * @see {@link URLUtils.BASIC_YOUTUBE_DOMAINS}
   */
  static YTURL_REGEX = (() => {
    // Domains that use /watch?v=
    const watchDomains = URLUtils.BASIC_YOUTUBE_DOMAINS.filter(d => d !== 'youtu.be');
    // Build the pattern
    const domainPattern = `(?:${watchDomains.map(d => d.replace(/\./g, '\\.')).join('|')})`;
    const fullPattern = `^https?:\\/\\/${domainPattern}\\/watch\\?v=|^https?:\\/\\/youtu\\.be\\/`;
    return new RegExp(fullPattern);
  })();

  /**
   * A regular expression for matching the YouTube video.
   *
   * @internal
   * @see {@link URLUtils.YTURL_REGEX}
   * @see {@link URLUtils.BASIC_YOUTUBE_DOMAINS}
   */
  static YTURL_WITH_ID_REGEX = new RegExp(
    `${URLUtils.YTURL_REGEX.source.replace(/\?\)$/, ')')}${URLUtils.VIDEO_ID_STRICT_REGEX.source}`
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
   * @param url - The YouTube URL to evaluate.
   * @returns A string with 11 characters representing the YouTube video ID.
   *
   * @throws {@link InvalidTypeError} If the given YouTube URL is neither a string nor `URL` object.
   * @throws {@link UnknownYouTubeDomainError} If the host name or domain name of given
   *                                           YouTube URL is unknown YouTube video domain.
   * @throws {@link IDExtractorError} If the extractor unable to extract the video ID,
   *                                  this can be happen due to incorrect YouTube URL.
   *
   * @internal
   */
  static extractVideoId(url: URLLike) {
    url = (typeof url === 'string') ? url.trim() : url;
    if (TypeUtils.isNullOrUndefined(url)
      // Only accept a URL with type either of string or URL object
      || (url && typeof url !== 'string')
      && (url && !(url instanceof URL))
    ) {
      throw new InvalidTypeError('Given YouTube URL is invalid type', {
        actualType: TypeUtils.getType(url),
        expectedType: `string | ${TypeUtils.getType(new URL('https://youtube.com'))}`  // string | [object URL]
      });
    }

    let parsedUrl: URL;
    let videoId: string | null = null;
    try {
      parsedUrl = (url instanceof URL) ? url : new URL(url);
    } catch (err) {
      // Throw back with InvalidTypeError error instance if it is TypeError
      if (err instanceof TypeError) throw new InvalidTypeError(err);
      throw err;  // Otherwise, throw without any instance change
    }
    const urlStr = url instanceof URL ? url.href : url;

    // Throw if the host name is not a valid YouTube domain
    if (!TypeUtils.isNullOrUndefined(parsedUrl.hostname)
      && !URLUtils.VALID_YOUTUBE_DOMAINS.includes(
        parsedUrl.hostname as typeof URLUtils.VALID_YOUTUBE_DOMAINS[0]
      )
    ) {
      throw new UnknownYouTubeDomainError(
        `Unknown YouTube video domain: \x1b[33m${parsedUrl.hostname}\x1b[0m`
      );
    }

    if (URLUtils.YTURL_WITH_ID_REGEX.test(urlStr)) {
      videoId = parsedUrl.searchParams.get('v');  // can be null
    }

    if (TypeUtils.isNullOrUndefined(videoId)) {
      const paths = parsedUrl.pathname.split('/');
      videoId = (parsedUrl.hostname === 'youtu.be') ? paths[1] : paths[2];
    }

    // If still no video ID, throw an error
    if (TypeUtils.isNullOrUndefined(videoId) || !URLUtils.validateId(videoId)) {
      throw new IDExtractorError(
        `Unable to extract video ID from URL: \x1b[33m${url}\x1b[0m`
      );
    }

    return videoId;
  };

  /**
   * Validates the given YouTube video ID.
   *
   * @param id - The video ID to validate.
   * @returns `true` if the given ID correctly represents the YouTube video ID;
   *          otherwise `false`.
   *
   * @throws {@link InvalidTypeError} If the given YouTube video ID is not a string.
   *
   * @internal
   */
  static validateId(id: string) {
    id = (typeof id === 'string') ? id.trim() : id;
    if (TypeUtils.isNullOrUndefined(id) || typeof id !== 'string') {
      throw new InvalidTypeError('Video ID must be a string', {
        actualType: TypeUtils.getType(id),
        expectedType: 'string'
      });
    }
    return URLUtils.VIDEO_ID_STRICT_REGEX.test(id);
  };

  /**
   * Validates the given YouTube URL and optionally validates its video ID.
   *
   * @param url - The YouTube URL to validate.
   * @param withId - Whether to also validate the video ID within the URL.
   *                 If `false`, the function will only validate the URL's domain name.
   * @returns `true` if the given URL is a valid YouTube URL; otherwise `false`.
   *
   * @throws {@link InvalidTypeError} If the given YouTube URL is neither a string nor `URL` object.
   *
   * @internal
   */
  static validateUrl(url: URLLike, withId = true) {
    url = (typeof url === 'string') ? url.trim() : url;
    if (TypeUtils.isNullOrUndefined(url) || (typeof url !== 'string' && !(url instanceof URL))) {
      throw new InvalidTypeError('Given YouTube URL is invalid type', {
        actualType: TypeUtils.getType(url),
        expectedType: `string | ${TypeUtils.getType(new URL('https://youtube.com'))}`  // string | URL
      });
    }

    let result = false;
    try {
      if (!(url instanceof URL)) new URL(url);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      // No error thrown even if the URL is malformed
      result = false;
    }
    const urlStr = url instanceof URL ? url.href : url;

    result = URLUtils.YTURL_REGEX.test(urlStr);
    if (withId) {
      try {
        result = result && !!URLUtils.extractVideoId(urlStr);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        result = result && false;
      }
    }

    return result;
  }
}
