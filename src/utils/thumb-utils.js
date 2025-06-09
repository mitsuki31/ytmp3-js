/**
 * @file YouTube thumbnail utilities module.
 *
 * This module provides a plenty of useful utility functions to retrieve and process thumbnails
 * from YouTube video's information.
 *
 * @module    utils/thumb-utils
 * @requires  error
 * @requires  utils/type-utils
 * @author    Ryuu Mitsuki <{@link https://github.com/mitsuki31}>
 * @since     2.0.0
 */


/**
 * @typedef  {Object} ThumbnailObject
 * @property {string} url - The URL of the thumbnail image.
 * @property {number} width - The width of the thumbnail image in pixels.
 * @property {number} height - The height of the thumbnail image in pixels.
 * @global
 * @since 2.0.0
 */

/**
 * An object containing arrays of author and video thumbnail objects.
 * Typically returned by the {@link module:utils/thumb-utils~ThumbnailUtils.getThumbnails `getThumbnails`} function.
 *
 * @typedef  {Object} AllThumbnailsObject
 * @property {Array.<ThumbnailObject>} author - An array of author thumbnail objects or an empty array if not available.
 * @property {Array.<ThumbnailObject>} video - An array of video thumbnail objects or an empty array if not available.
 * @global
 * @since 2.0.0
 */

'use strict';

const TypeUtils = require('./type-utils');
const { InvalidTypeError } = require('../error');

/**
 * A namespace containing all utility functions to process YouTube thumbnails.
 * @namespace module:utils/thumb-utils~ThumbnailUtils
 * @public
 * @since 2.0.0
 */
const ThumbnailUtils = { };

/**
 * Sorts an array of thumbnail objects by their resolution in ascending order.
 * 
 * Each thumbnail object is expected to have `width` and `height` properties.
 * The resolution of a thumbnail is calculated as the product of its width and height.
 * 
 * @param {Array.<ThumbnailObject>} thumbnails
 *        An array of thumbnail objects to be sorted.
 * @returns {Array.<ThumbnailObject>}
 *        A new array of thumbnail objects sorted by resolution in ascending order.
 * 
 * @throws {InvalidTypeError} If the input is not an array of thumbnail objects.
 *
 * @memberof module:utils/thumb-utils~ThumbnailUtils
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
ThumbnailUtils.sortThumbnailsByResolution = sortThumbnailsByResolution;

/**
 * Retrieves the author's thumbnails from the provided video details object and
 * optionally sorts the thumbnails by resolution.
 *
 * @param {ytdl.videoDetails} videoDetails - The video details object containing author information,
 *                                           retrieved from `ytdl.getInfo()` or {@link module:ytmp3~getVideosInfo `ytmp3.getVideosInfo()`}.
 * @param {boolean} [sort=true] - Whether to sort the thumbnails by resolution. Defaults to `true`.
 *
 * @returns {Array.<ThumbnailObject>} An array of author thumbnails, optionally sorted by resolution.
 *                                          If no thumbnails are found, an empty array is returned.
 *
 * @throws {InvalidTypeError} If the provided `videoDetails` is not a plain object.
 *
 * @memberof module:utils/thumb-utils~ThumbnailUtils
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
ThumbnailUtils.getAuthorThumbnails = getAuthorThumbnails;

/**
 * Retrieves the video thumbnails from the provided video details object and
 * optionally sorts the thumbnails by resolution.
 *
 * @param {ytdl.videoDetails} videoDetails - The video details object containing video information,
 *                                           retrieved from `ytdl.getInfo()` or {@link module:ytmp3~getVideosInfo `ytmp3.getVideosInfo()`}.
 * @param {boolean} [sort=true] - Whether to sort the thumbnails by resolution. Defaults to `true`.
 *
 * @returns {Array.<ThumbnailObject>} An array of video thumbnails, optionally sorted by resolution.
 *                                         If no thumbnails are found, returns an empty array.
 *
 * @throws {InvalidTypeError} If the provided `videoDetails` is not a plain object.
 *
 * @memberof module:utils/thumb-utils~ThumbnailUtils
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
ThumbnailUtils.getVideoThumbnails = getVideoThumbnails;

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
 * @memberof module:utils/thumb-utils~ThumbnailUtils
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
ThumbnailUtils.getAllThumbnails = getAllThumbnails;

/**
 * Retrieves a thumbnail based on the desired resolution level.
 *
 * ### Resolution Level
 * - `low`: Corresponds to `hqdefault` thumbnail.
 * - `medium`: Corresponds to `mqdefault` thumbnail.
 * - `high`: Prioritizes the `maxresdefault` thumbnail if available, otherwise falls back to `sddefault`.
 * - `max`: Corresponds to `maxresdefault` thumbnail if available, otherwise return `null`.
 *
 * **Note:** It is recommended to use `'high'` to have a fallback value in case the `maxresdefault` is unavailable.
 *
 * @param {Array.<ThumbnailObject>} thumbnails - An array of thumbnail objects.
 * @param {'low' | 'medium' | 'high' | 'max'} resolutionType - Desired resolution level type.
 *
 * @returns {ThumbnailObject | null} Thumbnail object matching the desired resolution, or `null` if
 *                                   the desired thumbnail is unavailable.
 *
 * @throws {InvalidTypeError} If the resolution type is invalid.
 *
 * @memberof module:utils/thumb-utils~ThumbnailUtils
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
ThumbnailUtils.getThumbnailByResolution = getThumbnailByResolution;

/**
 * Alias for {@link module:utils/thumb-utils~ThumbnailUtils.getThumbnailByResolution `ThumbnailUtils.getThumbnailByResolution`}.
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
 * **Note:** It is recommended to use `'high'` to have a fallback value in case the `maxresdefault` is unavailable.
 *
 * @param {Array.<ThumbnailObject>} thumbnails - An array of thumbnail objects.
 * @param {'low' | 'medium' | 'high' | 'max'} [resolutionType] - Desired resolution level type.
 *
 * @returns {ThumbnailObject | null} Thumbnail object matching the desired resolution, or `null` if
 *                                   the desired thumbnail is unavailable.
 *
 * @throws {InvalidTypeError} If the resolution type is invalid.
 *
 * @memberof module:utils/thumb-utils~ThumbnailUtils
 * @public
 * @since 2.0.0
 */
function getThumbnail(thumbnails, resolutionType) {
  // If the `resolutionType` is not provided, default to 'high' but prioritize the 'maxresdefault'
  if (TypeUtils.isNullOrUndefined(resolutionType)) resolutionType = 'high';
  return getThumbnailByResolution(thumbnails, resolutionType);
}
ThumbnailUtils.getThumbnail = getThumbnail;


module.exports = {
  ThumbnailUtils,
  ThumbUtils: ThumbnailUtils,  // alias for `ThumbnailUtils`
  ...ThumbnailUtils
};
