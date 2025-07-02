/**
 * YouTube thumbnail utilities module.
 *
 * This module provides a plenty of useful utility functions to retrieve and process thumbnails
 * from YouTube video information.
 *
 * @module    utils/thumb-utils
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @since     2.0.0
 */

import type { YT } from 'youtubei.js';
import type { Thumbnail } from '#/types/ytmp3';
import type VideoInfo from '#/core/internal/classes/VideoInfo';
import { TypeUtils } from '#/vendor/type-utils';
import { InvalidTypeError } from '#error';

/**
 * Type alias for sorted thumbnail objects.
 *
 * @public
 * @since  5.0.0
 * @see    {@link Thumbnail}
 */
export type SortedThumbnail = Thumbnail;

/**
 * Sorts an array of thumbnail objects by their resolution in ascending order.
 * 
 * Each thumbnail object is expected to have `width` and `height` properties.
 * The resolution of a thumbnail is calculated as the product of its width and height.
 *
 * @remarks The function will never mutate the input array, and will return a new sorted array.
 *
 * @param thumbnails - An array of thumbnail objects to be sorted.
 * @returns A new array of thumbnail objects sorted by resolution in ascending order.
 * 
 * @throws {@link InvalidTypeError} If the input is not an array of thumbnail objects.
 *
 * @public
 * @since 2.0.0
 */
export function sortThumbnailsByResolution(thumbnails: Thumbnail[]): SortedThumbnail[] {
  // Runtime validation
  if (!Array.isArray(thumbnails)) {
    throw new InvalidTypeError('Thumbnails must be an array of thumbnail objects', {
      actualType: TypeUtils.getType(thumbnails),
      expectedType: TypeUtils.getType([])
    });
  }

  // We need to spread the array to avoid mutating it
  return ([...thumbnails] as Thumbnail[]).sort((a, b) => {
    const resolutionA = a.width * a.height;
    const resolutionB = b.width * b.height;
    return resolutionA - resolutionB;
  });
}

/**
 * Retrieves the video thumbnails from the provided video info and
 * optionally sorts the thumbnails by resolution.
 *
 * @param videoInfo - The video details object containing video information.
 * @param sort - Whether to sort the thumbnails by resolution. Defaults to `true`.
 *
 * @returns An array of video thumbnails, optionally sorted by resolution.
 *          If no thumbnails are found, returns an empty array.
 *
 * @throws {@link InvalidTypeError} If the provided {@link videoInfo} is not a plain object.
 *
 * @public
 * @since   2.0.0
 * @see     {@link sortThumbnailsByResolution} - Function for sorting thumbnails by resolution
 */
export function getVideoThumbnails(videoInfo: VideoInfo | YT.VideoInfo, sort?: boolean): Thumbnail[];
export function getVideoThumbnails(videoInfo: VideoInfo | YT.VideoInfo, sort: true): SortedThumbnail[];
export function getVideoThumbnails(videoInfo: VideoInfo | YT.VideoInfo, sort = true): Thumbnail[] {
  if (!TypeUtils.isObject(videoInfo)) {
    throw new InvalidTypeError('Invalid video info object type', {
      actualType: TypeUtils.getType(videoInfo),
      expectedType: TypeUtils.getType({})
    });
  }

  let thumbnails: Thumbnail[] | undefined;
  if ((videoInfo as VideoInfo).thumbnail) {
    thumbnails = (videoInfo as VideoInfo).thumbnail;
  } else {
    thumbnails = (videoInfo as YT.VideoInfo).basic_info.thumbnail;
  }

  // Return an empty array if no thumbnails are found
  if (!thumbnails) return [];

  return sort ? sortThumbnailsByResolution(thumbnails) : thumbnails;
}

/**
 * Retrieves a thumbnail based on the desired resolution level.
 *
 * ### Resolution Level
 * - `low`: Corresponds to `'hqdefault'` thumbnail.
 * - `medium`: Corresponds to `'mqdefault'` thumbnail.
 * - `high`: Prioritizes the `'maxresdefault'` thumbnail if available, otherwise falls back to `'sddefault'`.
 * - `max`: Corresponds to `maxresdefault` thumbnail if available, otherwise return `null`.
 *
 * @remarks It is recommended to use `'high'` to have a fallback value in case the `'maxresdefault'` is unavailable.
 *
 * @param videoInfo - The video info object.
 * @param resolutionType - Desired resolution level type.
 *
 * @returns Thumbnail object matching the desired resolution, or `null` if the desired thumbnail is unavailable.
 *
 * @throws {@link InvalidTypeError} If the resolution type is invalid.
 *
 * @public
 * @since   2.0.0
 */
export function getThumbnailByResolution(
  videoInfo: VideoInfo | YT.VideoInfo,
  resolutionType: 'low' | 'medium' | 'high' | 'max'
): Thumbnail | null {
  const knownResolutions = new Set(['low', 'medium', 'high', 'max']);
  if (!resolutionType || !knownResolutions.has(resolutionType)) {
    throw new InvalidTypeError(`Invalid resolution type. Use one of ${Array.from(knownResolutions.values()).join(', ')}`, {
      actualType: typeof resolutionType === 'string' ? resolutionType : TypeUtils.getType(resolutionType),
      expectedType: Array.from(knownResolutions.values()).map(r => `'${r}'`).join(' | ')
    });
  }

  if (!TypeUtils.isObject(videoInfo)) {
    throw new InvalidTypeError('Invalid video info object type', {
      actualType: TypeUtils.getType(videoInfo),
      expectedType: TypeUtils.getType([])
    });
  }

  // Get the thumbnails
  const thumbnails = getVideoThumbnails(videoInfo);
  // Sort the thumbnails for easier processing
  const sortedThumbnails = sortThumbnailsByResolution(thumbnails);
  let thumbnail: Thumbnail | null = null;

  // Mapping of resolution keys to thumbnail identifiers
  const resolutionMapping = {
    low: 'hqdefault',
    medium: 'mqdefault',
    high: ['maxresdefault', 'sddefault'], // high has a fallback to 'sddefault'
    max: 'maxresdefault',
  };

  // Handle high resolution fallback
  const targetKeys = resolutionMapping[resolutionType];
  if (Array.isArray(targetKeys)) {
    for (const key of targetKeys) {
      if (!thumbnail) {
        thumbnail = sortedThumbnails.find(thumb => thumb.url.includes(key)) ?? null;
        break;
      }
    }
  }

  // Standard resolution lookup
  thumbnail = thumbnail ?? (sortedThumbnails.find(thumb =>
    thumb.url.includes(targetKeys as string)) ?? null);

  // ! FIXME: Currently we just comment these lines until we find a way to get the author thumbnail

  // If the thumbnail is still not found, handle the case where the thumbnail is an author thumbnail
  // if (!thumbnail &&
  //   Object.values(sortedThumbnails).some(t => t.width === t.height
  //     || /=s[0-9]+(x[0-9]+)?/.test(t.url))
  // ) {
  //   // The author thumbnail has a square resolution and may contain size parameters in the URL
  //   if (resolutionType === 'max') resolutionType = 'high';  // Change the resolution type to 'high'
  //   const resolutionIndex = { low: 0, medium: 1, high: 2 };
  //   thumbnail = sortedThumbnails[resolutionIndex[resolutionType]] || null;
  // }

  return thumbnail ?? null;
}

/**
 * Alias for {@link getThumbnailByResolution} function.
 *
 * A bit different from {@link getThumbnailByResolution}, this function will use `'high'` as
 * the default resolution type if not provided. This resolution type prioritizes the `'maxresdefault'`
 * thumbnail if available, otherwise falls back to `'sddefault'`.
 *
 * ### Resolution Level
 * - `low`: Corresponds to `'hqdefault'` thumbnail.
 * - `medium`: Corresponds to `'mqdefault'` thumbnail.
 * - `high`: Prioritizes the `'maxresdefault'` thumbnail if available, otherwise falls back to `'sddefault'`.
 * - `max`: Corresponds to `'maxresdefault'` thumbnail if available, otherwise return `null`.
 *
 * @remarks It is recommended to use `'high'` to have a fallback value in case the `'maxresdefault'` is unavailable.
 *
 * @param videoInfo - The video info object.
 * @param resolutionType - The desired resolution level type.
 *
 * @returns Thumbnail object matching the desired resolution, or `null` if the desired thumbnail is unavailable.
 *
 * @throws {@link InvalidTypeError} If the resolution type is invalid.
 *
 * @public
 * @since   2.0.0
 * @see     {@link getThumbnailByResolution}
 */
export function getThumbnail(
  videoInfo: VideoInfo | YT.VideoInfo,
  resolutionType?: 'low' | 'medium' | 'high' | 'max'
): Thumbnail | null {
  // If the `resolutionType` is not provided, default to 'high' but prioritize the 'maxresdefault'
  return getThumbnailByResolution(videoInfo, resolutionType ?? 'high');
}
