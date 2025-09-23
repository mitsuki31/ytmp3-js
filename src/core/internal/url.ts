/**
 * @module    core/internal/url
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import { InvalidTypeError, URLValidationError, IDValidationError } from '#error';
import { isString, TypeUtils, type URLLike, URLUtils } from '#/utils/index.js';

const BASE_URL = 'https://www.youtube.com/';  // Web-based URL

/**
 * Extracts and validates a YouTube URL or video ID.
 *
 * This function takes a string or `URL` object as input, validates it
 * as a YouTube URL or video ID, and returns a tuple containing the
 * validated URL and video ID.
 *
 * @param input - The YouTube URL or video ID to extract and validate.
 * @returns A tuple containing the validated URL and video ID.
 *
 * @internal
 * @since 5.0.0
 */
export function extractAndValidateURL(input: URLLike): [URL, string] {
  let videoId: string | undefined = undefined;
  let url: URL | undefined = undefined;

  if (!(input instanceof URL) && !isString(input)) {
    throw new InvalidTypeError('Input must be a string (ID or URL) or URL object', {
      actualType: TypeUtils.getType(input),
      expectedType: `'string' | 'URL'`
    });
  }

  if (input instanceof URL) {
    // Input is already a URL object
    if (!URLUtils.validateUrl(input, true)) {
      throw new URLValidationError(`Given YouTube video URL is invalid: ${input.href}`);
    }
  } else if (isString(input)) {
    if (input.startsWith('http://') || input.startsWith('https://')) {
      // Input is a string URL
      url = new URL(input.startsWith('http://') ? input.replace('http://', 'https://') : input);
      if (!URLUtils.validateUrl(input, true)) {
        throw new URLValidationError(`Given YouTube video URL is invalid: ${input}`);
      }
      videoId = URLUtils.extractVideoId(url);
    } else {
      // Input is a raw video ID
      if (!URLUtils.validateId(input)) {
        throw new IDValidationError(`Invalid YouTube video ID [length: ${input.length}/${URLUtils.MAX_ID_LENGTH}]: ${input}`);
      }
      videoId = input;
      // Construct a proper HTTPS YouTube video URL
      url = new URL(`${BASE_URL}watch?v=${videoId}`);
    }
  }

  return [url, videoId] as [URL, string];
}
