/**
 * @file This module provides caching functionalities for YouTube video information.
 *
 * It includes classes and methods to encode, decode, compress, and decompress
 * video information, as well as to create, check, and retrieve cached data.
 *
 * @example
 * const { VInfoCache } = require('./cache');
 * 
 * async function cacheVideoInfo(videoInfo) {
 *   try {
 *     const cachePath = await VInfoCache.createCache(videoInfo);
 *     console.log(`Cache created at: ${cachePath}`);
 *   } catch (error) {
 *     console.error('Error creating cache:', error);
 *   }
 *   return cachePath;
 * }
 * 
 * async function getCachedVideoInfo(videoId) {
 *   try {
 *     const cachedInfo = await VInfoCache.getCache(videoId);
 *     if (cachedInfo) {
 *       console.log('Cached video info:', cachedInfo);
 *     } else {
 *       console.log('No cache found for video ID:', videoId);
 *     }
 *   } catch (error) {
 *     console.error('Error retrieving cache:', error);
 *   }
 *   return cachedInfo;
 * }
 *
 * // Example usage
 * const videoInfo = ytdl.getInfo('https://www.youtube.com/watch?v=abc123');
 * const cachePath = await cacheVideoInfo(videoInfo);
 * const cache = await getCachedVideoInfo('abc123');
 * console.log(cachePath);
 * console.log(cache);
 *
 * @module    cache
 * @requires  utils
 * @requires  {@link https://npmjs.com/package/lsfnd npm:lsfnd}
 * @requires  {@link https://nodejs.org/api/fs.html node:fs}
 * @requires  {@link https://nodejs.org/api/path.html node:path}
 * @requires  {@link https://nodejs.org/api/zlib.html node:zlib}
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     2.0.0
 */

/**
 * @typedef  {Object} VideoInfoCacheObject
 * @property {string} id - The ID of the video.
 * @property {string} title - The title of the video or `'<unknown>'` if not available.
 * @property {string} authorName - The name of the author of the video or `'<unknown>'` if not available.
 * @property {string} videoUrl - The URL of the video.
 * @property {string} authorUrl - The URL of the author of the video (refers to author profile).
 * @property {Object} videoInfo - The sealed video information object.
 * @property {'zlib/bin'} videoInfo.type - The type of the video information.
 * @property {string} videoInfo.data - The compressed and binary encoded video information data.
 * @global
 * @since    2.0.0
 */

/**
 * @typedef  {Object} ExtractedVideoInfoCacheObject
 * @property {string} id - The ID of the video.
 * @property {string} title - The title of the video or `'<unknown>'` if not available.
 * @property {string} authorName - The name of the author of the video or `'<unknown>'` if not available.
 * @property {string} videoUrl - The URL of the video.
 * @property {string} authorUrl - The URL of the author of the video (refers to author profile).
 * @property {ytdl.videoInfo} videoInfo - The extracted and unsealed video information object.
 * @global
 * @since    2.0.0
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { lsFiles } = require('lsfnd');

const {
  InvalidTypeError,
  IDValidationError,
  CacheValidationError
} = require('./error');
const {
  YTMP3_HOMEDIR,
  createDirIfNotExist,
  TypeUtils,
  URLUtils
} = require('./utils');

/**
 * The path to the cache directory of YTMP3.
 * @type {string}
 * @default  <code>`${YTMP3_HOMEDIR}/.cache`</code>
 * @constant
 * @package
 * @since    2.0.0
 * @see      {@link module:utils~YTMP3_HOMEDIR YTMP3_HOMEDIR}
 */
const CACHE_PATH = path.join(YTMP3_HOMEDIR, '.cache');

/**
 * The path to the cache directory for video information
 * relative to the cache directory.
 * @type {string}
 * @default  <code>`${CACHE_PATH}/_vInfoContent`</code>
 * @constant
 * @package
 * @since    2.0.0
 * @see      {@link module:cache~CACHE_PATH}
 */
const VINFO_CACHE_PATH = path.join(CACHE_PATH, '_vInfoContent');

/**
 * The keys and types for the cache object. Nothing special, for type checking purpose only.
 * @constant
 * @private
 * @since    2.0.0
 * @see      {@link VideoInfoCacheObject}
 */
const CACHE_KEYS = {
  id: 'string',
  encoding: 'binary',
  title: 'string',
  authorName: 'string',
  videoUrl: 'string',
  authorUrl: 'string',
  videoInfo: {
    type: 'zlib/bin',
    data: '[object ytdl.videoInfo]'  // Keep, but will never be used
  }
};


/**
 * Validates YouTube video ID before cache creation and throws
 * an error if the video ID is not valid.
 *
 * @param {string} id - The YouTube video ID to validate.
 * @returns {void}
 *
 * @throws {InvalidTypeError} If the given ID is not a string.
 * @throws {IDValidationError} If the given ID is not a valid YouTube video ID.
 *
 * @private
 * @since   2.0.0
 */
function validateId(id) {
  if (!id || typeof id !== 'string') {
    throw new InvalidTypeError('Video ID must be a string', {
      actualType: TypeUtils.getType(id),
      expectedType: 'string'
    });
  }

  // Validate the video ID
  if (!URLUtils.validateId(id)) {
    throw new IDValidationError(`Invalid YouTube video ID: ${id}`);
  }
}

/**
 * Generates the cache path for a given video ID.
 *
 * The cache path is generated by joining the cache directory path
 * with the provided video ID.
 *
 * @param {string} id - The unique identifier for the cache entry.
 * @returns {string} The absolute path to the cache file.
 *
 * @package
 * @since   2.0.0
 * @see {@link module:cache~VINFO_CACHE_PATH VINFO_CACHE_PATH}
 */
function getCachePath(id) {
  return path.join(VINFO_CACHE_PATH, id);
}

/**
 * @classdesc A static class for encoding and decoding cache objects using Base64.
 *
 * @class
 * @hideconstructor
 * @package
 * @since   2.0.0
 */
class CacheBase64 {
  /**
   * Encodes a given object into a Base64 string.
   *
   * @param {Object} obj - The object to encode.
   * @returns {string} The Base64 encoded string representation of the object.
   *
   * @package
   * @method
   * @since   2.0.0
   */
  static encodeCacheObject(obj) {
    const jsonString = JSON.stringify(obj);             // Convert object to string
    return Buffer.from(jsonString).toString('base64');  // Encode to Base64
  }


  /**
   * Decodes a Base64 encoded string into a JSON object.
   *
   * @param {string} encodedStr - The Base64 encoded string to decode.
   * @returns {Object} The decoded JSON object.
   *
   * @package
   * @method
   * @since   2.0.0
   */
  static decodeCacheObject(encodedStr) {
    const jsonString = Buffer.from(encodedStr, 'base64').toString('utf8');  // Decode from Base64
    return JSON.parse(jsonString);  // Parse back to original object
  }
}

/**
 * @classdesc A static class for compressing and decompressing cache objects using `zlib`.
 *
 * @class
 * @hideconstructor
 * @package
 * @since   2.0.0
 */
class CacheZLib {
  /**
   * Compresses a JavaScript object using `zlib` deflate.
   *
   * @param {Object} obj - The object to be compressed.
   *
   * @returns {Promise.<Buffer>} A promise that resolves with the compressed data as a `Buffer`.
   *
   * @throws {Error} If there is an error during compression.
   *
   * @static
   * @async
   * @method
   * @package
   * @since   2.0.0
   */
  static async deflateCacheObject(obj) {
    const jsonString = JSON.stringify(obj);
    return await new Promise((resolve, reject) => {
      zlib.deflate(jsonString, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Inflates a deflated cache object.
   *
   * @param {Record<'type' | 'data', string>} deflatedObj - The deflated cache object.
   * @param {'zlib/bin'} deflatedObj.type - The type of the deflated object.
   * @param {string} deflatedObj.data - The deflated data encoded as binary.
   *
   * @throws {InvalidTypeError} If the type of the deflated object is invalid.
   * @returns {Promise.<Object>} A promise that resolves to the inflated cache object.
   */
  static async inflateCacheObject(deflatedObj) {
    if (deflatedObj?.type !== CACHE_KEYS.videoInfo.type) {
      throw new InvalidTypeError('Invalid deflated object type', {
        actualType: deflatedObj?.type,
        expectedType: CACHE_KEYS.videoInfo.type
      });
    }

    const buffer = await new Promise((resolve, reject) => {
      zlib.inflate(
        Buffer.from(deflatedObj.data, CACHE_KEYS.encoding), (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
    });
    const jsonString = buffer.toString('utf8');
    return JSON.parse(jsonString);
  }
}


/**
 * @classdesc A static class for creating, checking, and retrieving cached video information.
 *
 * This class provides methods to create a cache for YouTube video information, check if a cache exists,
 * and retrieve the cached video information. The cache is stored in a JSON file compressed using zlib and
 * encoded in binary format.
 *
 * If the `cacheOptions.force` is set to `true`, the existing cache with similar ID as video ID from provided
 * video information object will be overwritten with the specified video information object and all cache properties
 * will be updated.
 *
 * Written cache files are using the structure of the {@link VideoInfoCacheObject} type.
 *
 * @class
 * @package
 * @since   2.0.0
 */
class VInfoCache {
  /**
   * Creates a cache for the given YouTube video information.
   *
   * @param {ytdl.videoInfo} vInfo - The YouTube video information object.
   * @param {Object | string} [cacheOptions] - The options for creating the cache. If a string is provided,
   *                                           it will be treated as the path to the cache directory.
   * @param {string} [cacheOptions.cacheDir] - The path to the cache directory, defaults to
   *                                            {@link module:cache~VINFO_CACHE_PATH `VINFO_CACHE_PATH`} if not provided.
   * @param {boolean} [cacheOptions.force] - If set to `true`, the function will forcily creates the cache file even the
   *                                         cache file for current video ID already exist and overwrite with the specified
   *                                         video information. This also makes the `createdDate` cache property to be updated.
   *
   * @returns {Promise.<string>} The path to the cached video information.
   *
   * @throws {InvalidTypeError} If the provided video information is not a plain object
   *                            or the cache options type is invalid.
   *
   * @static
   * @async
   * @method
   * @package
   * @since   2.0.0
   */
  static async createCache(vInfo, cacheOptions={}) {
    if (!TypeUtils.isPlainObject(vInfo)) {
      throw new InvalidTypeError('Invalid YouTube video info object', {
        actualType: TypeUtils.getType(vInfo),
        expectedType: TypeUtils.getType({})
      });
    }
    if (!(typeof cacheOptions === 'string' || TypeUtils.isPlainObject(cacheOptions))) {
      throw new InvalidTypeError('Cache options type is invalid', {
        actualType: TypeUtils.getType(cacheOptions),
        expectedType: `'string' | '${TypeUtils.getType({})}'`
      });
    }

    if (typeof cacheOptions === 'string') cacheOptions = { cacheDir: cacheOptions };
    const { videoId } = vInfo.videoDetails || {};
    const cachePath = path.join(
      cacheOptions.cacheDir ? cacheOptions.cacheDir : VINFO_CACHE_PATH,
      videoId
    );

    // Check if the cache file already exists and `force` option is falsy
    if (fs.existsSync(cachePath) && !cacheOptions.force) return cachePath;
    await createDirIfNotExist(path.dirname(cachePath));

    vInfo = Object.assign({}, {
      id: videoId,
      encoding: CACHE_KEYS.encoding,
      createdDate: Date.now(),
      title: vInfo.videoDetails?.title || '<unknown>',
      authorName: vInfo.videoDetails?.author?.name || '<unknown>',
      videoUrl: `https://${URLUtils.VALID_YOUTUBE_DOMAINS[0]}/watch?v=${videoId}`,
      authorUrl: vInfo.videoDetails?.ownerProfileUrl
        ?.replace(/^http:/, 'https:') || null,  // Replace HTTP with HTTPS, if present
      videoInfo: {
        type: CACHE_KEYS.videoInfo.type,
        data: (await CacheZLib.deflateCacheObject(vInfo)).toString(CACHE_KEYS.encoding)
      }
    });

    // Write the cache file
    await fs.promises.writeFile(cachePath, JSON.stringify(vInfo));
    return cachePath;
  }

  /**
   * Retrieves the cached video information for a given video ID.
   *
   * If the `cacheOptions.humanReadable` option is enabled, the function will return a cache formatted into a
   * simple human-readable string instead of the cached video information object, which can be useful for
   * checking the stored cache information without having to parse it.
   *
   * If the `cacheOptions.validate` option is enabled, the function will validate the cache object before returning it
   * and throw a {@link CacheValidationError} if the cache object is invalid.
   *
   * @param {string} id - The unique identifier for the YouTube video.
   * @param {Object | string} [cacheOptions] - The options for retrieving the cache. If a string is provided,
   *                                           it will be treated as the path to the cache directory.
   * @param {string} [cacheOptions.cacheDir] - The path to the cache directory, defaults to
   *                                            {@link module:cache~VINFO_CACHE_PATH `VINFO_CACHE_PATH`} if not provided.
   * @param {boolean} [cacheOptions.humanReadable] - Whether to format the cache into a human-readable string. Can be useful
   *                                                 for checking the stored cache information.
   * @param {boolean} [cacheOptions.validate] - Whether to validate the cache object before returning it.
   *
   * @returns {Promise.<ExtractedVideoInfoCacheObject | string | null>}
   *          A promise that resolves to the cached video information object, a cache formatted into a simple human-readable string
   *          if the `cacheOptions.humanReadable` option is enabled, or `null` if the cache does not exist.
   *
   * @throws {InvalidTypeError} If the given ID is not a string or the cache options type is invalid.
   * @throws {IDValidationError} If the given ID is not a valid YouTube video ID.
   * @throws {CacheValidationError} If the parsed cache object does not meet the expected format or it is invalid.
   * @throws {Error} If there is an error reading the cache file.
   *
   * @static
   * @async
   * @method
   * @package
   * @since   2.0.0
   */
  static async getCache(id, cacheOptions={}) {
    validateId(id);
    if (!(typeof cacheOptions === 'string' || TypeUtils.isPlainObject(cacheOptions))) {
      throw new InvalidTypeError('Cache options type is invalid', {
        actualType: TypeUtils.getType(cacheOptions),
        expectedType: `'string' | '${TypeUtils.getType({})}'`
      });
    }
    if (typeof cacheOptions === 'string') cacheOptions = { cacheDir: cacheOptions };

    const cacheDir = typeof cacheOptions.cacheDir === 'string'
      ? path.join(cacheOptions.cacheDir, id)
      : getCachePath(id);

    if (!fs.existsSync(cacheDir)) return null;
    let cache = JSON.parse(await fs.promises.readFile(cacheDir));

    // Check and validate the cache object, if `cacheOptions.validate` is enabled
    if (cacheOptions.validate) {
      if (!(cache && cache.id === id
          && cache.encoding === CACHE_KEYS.encoding
          && cache.videoInfo.type === CACHE_KEYS.videoInfo.type)) {
        throw new CacheValidationError('Invalid cache object', {
          id,
          type: TypeUtils.getType(cache),
          path: cacheDir
        });
      }
    }

    // Decrypt the video information object
    const decryptedInfo = ['type', 'data'].every(key => key in cache.videoInfo)
      ? await CacheZLib.inflateCacheObject(cache.videoInfo)
      : null;
    cache = { ...cache, videoInfo: decryptedInfo };

    // Return early if option to format the cache into human-readable string is falsy
    if (!cacheOptions.humanReadable) return cache;

    const videoLen =
      `${Math.floor(cache.videoInfo.videoDetails?.lengthSeconds / 60 || 0)} min(s)`
        + ` ${cache.videoInfo.videoDetails?.lengthSeconds % 60 || 0} sec(s)`
        + ' \x1b[1;97m-- \x1b[0;36m'
        + `[${cache.videoInfo.videoDetails?.lengthSeconds || 0}s]`;
    const publishDate = new Date(cache.videoInfo.videoDetails.publishDate)
      .toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' });
    const createdDate = new Date(cache.createdDate)
      .toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'long' });

    return `
      \x1b[1;95m>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>{s}{s}
      \x1b[96m${cache.id}\x1b[1;95m{s}{s}
      <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\x1b[0m{n}
      {s}{s}[\x1b[1;32mTitle\x1b[0m]{t}\x1b[93m${cache.title.replace(/[ ]{2,}/g, ' ')}\x1b[0m{n}
      {s}{s}[\x1b[1;32mAuthor\x1b[0m]{t}\x1b[93m${cache.authorName}\x1b[0m{n}
      {s}{s}[\x1b[1;32mVideo URL\x1b[0m]{t}\x1b[93m${cache.videoUrl}{s}
      \x1b[33m(${cache.id})\x1b[0m{n}
      {s}{s}[\x1b[1;32mAuthor URL\x1b[0m]{t}\x1b[93m${cache.authorUrl}\x1b[0m{n}
      {s}{s}[\x1b[1;32mDuration\x1b[0m]{t}\x1b[93m${videoLen}\x1b[0m{n}
      {s}{s}[\x1b[1;32mPublish Date\x1b[0m]{s}{s}\x1b[93m${publishDate}\x1b[0m{n}
      {s}{s}[\x1b[1;32mCache Created\x1b[0m]{s}\x1b[93m${createdDate}\x1b[0m{n}
      \x1b[1;95m^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\x1b[0m
    `.trim().replace(/[ \n]{2,}/g, '')
      .replace(/\{s\}/g, ' ')
      .replace(/\{n\}/g, '\n')
      .replace(/\{t\}/g, '\t  ');
  }

  /**
   * Retrieves all caches from the specified cache directory.
   *
   * This function ensures that the cache directory exists, lists all files
   * matching the specified pattern, and reads the content of each cache file.
   * Returns an empty array if no caches are found in the cache directory.
   *
   * If `cacheOptions.humanReadable` option is enabled, the function formats the cache
   * contents into a simple human-readable string.
   *
   * @param {Object | string} [cacheOptions] - The options for retrieving the cache. If a string is provided,
   *                                           it will be treated as the path to the cache directory.
   * @param {string} [cacheOptions.cacheDir] - The path to the cache directory, defaults to
   *                                            {@link module:cache~VINFO_CACHE_PATH `VINFO_CACHE_PATH`} if not provided.
   * @param {boolean} [cacheOptions.humanReadable] - Whether to format the cache into a human-readable string. Can be useful
   *                                                 for checking the stored cache information.
   * @param {boolean} [cacheOptions.validate] - Whether to validate for each cache object.
   *
   * @returns {Promise.<Array.<ExtractedVideoInfoCacheObject> | string>}
   *          A promise that resolves to an array of cache contents, a cache formatted into a simple human-readable string
   *          if the `cacheOptions.humanReadable` option is enabled, or an empty array if no caches are found and `cacheOptions.humanReadable`
   *          option is disabled; otherwise, returns a `null`.
   *
   * @throws {InvalidTypeError} If the cache path is not a string.
   * @throws {CacheValidationError} If the parsed cache object does not meet the expected format or it is invalid.
   * @throws {Error} If there is an issue reading the cache directory or files.
   *
   * @static
   * @async
   * @method
   * @package
   * @since   2.0.0
   */
  static async getAllCaches(cacheOptions) {
    if (!(typeof cacheOptions === 'string' || TypeUtils.isPlainObject(cacheOptions))) {
      throw new InvalidTypeError('Cache options type is invalid', {
        actualType: TypeUtils.getType(cacheOptions),
        expectedType: `'string' | '${TypeUtils.getType({})}'`
      });
    }
    if (typeof cacheOptions === 'string') cacheOptions = { cacheDir: cacheOptions };

    cacheOptions.cacheDir = cacheOptions.cacheDir || VINFO_CACHE_PATH;
    await createDirIfNotExist(cacheOptions.cacheDir);
    const cacheList = await lsFiles(cacheOptions.cacheDir, {
      match: new RegExp(`[a-zA-Z0-9_-]{${URLUtils.MAX_ID_LENGTH}}$`),
      absolute: true
    });
    if (!cacheList || !cacheList?.length) {
      // Return an array only if the `humanReadable` option is disabled
      return !cacheOptions.humanReadable ? [] : null;  // Return early
    }

    if (cacheOptions.humanReadable) {
      let cacheStr = '';
      for (const cache of cacheList) {
        cacheStr += await VInfoCache.getCache(path.basename(cache), cacheOptions);
        if (cacheList.indexOf(cache) < cacheList.length - 1) cacheStr += '\n';
      }
      return cacheStr;
    }

    const caches = [];
    for (const cache of cacheList) {
      const cacheObj = await VInfoCache.getCache(path.basename(cache), cacheOptions);
      caches.push(cacheObj);
    }
    return caches;
  }

  /**
   * Deletes the stored cache for a given video ID.
   *
   * The function will delete the cache file for the specified video ID if it exists.
   * If you specified the `cacheOptions.cacheDir` option, the function will use the provided path
   * to locate the cache file. Otherwise, it will use the default cache directory path.
   *
   * @param {string} id - The video ID to delete the cache for.
   * @param {Object} cacheOptions - Options for the cache.
   * @param {string} [cacheOptions.cacheDir] - The path to the cache directory. Defaults to
   *                                            {@link module:cache~VINFO_CACHE_PATH `VINFO_CACHE_PATH`}.
   * @returns {Promise.<boolean>} A promise that resolves to `true` if the cache is deleted successfully,
   *                              or `false` if the cache does not exist.
   *
   * @throws {InvalidTypeError} If the given cache options is not a plain object.
   *
   * @static
   * @async
   * @method
   * @package
   * @since   2.0.0
   */
  static async deleteCache(id, cacheOptions) {
    validateId(id);  // Validate the video ID

    if (!TypeUtils.isPlainObject(cacheOptions)) {
      throw new InvalidTypeError('Cache options type is invalid', {
        actualType: TypeUtils.getType(cacheOptions),
        expectedType: TypeUtils.getType({})
      });
    }

    cacheOptions.cacheDir = cacheOptions.cacheDir || VINFO_CACHE_PATH;
    const cachePath = typeof cacheOptions.cacheDir === 'string'
      ? path.join(cacheOptions.cacheDir, id)
      : getCachePath(id);

    // Remove the cache file only if exists
    try {
      await fs.promises.access(cachePath, fs.constants.F_OK);
      await fs.promises.unlink(cachePath);
    // eslint-disable-next-line no-unused-vars
    } catch (_) {
      return false;
    }

    return true;
  }
}


module.exports = {
  CACHE_KEYS,
  CACHE_PATH,
  VINFO_CACHE_PATH,
  getCachePath,
  CacheBase64,
  CacheZLib,
  VInfoCache
};
