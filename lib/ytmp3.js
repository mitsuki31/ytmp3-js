/**
 * @file Core library for **YTMP3** project.
 *
 * This module contains the core functionality for **YTMP3** project.
 * It utilizes the [@distube/ytdl-core](https://www.npmjs.com/package/@distube/ytdl-core) (to download YouTube videos) and
 * [fluent-ffmpeg](https://www.npmjs.com/package/fluent-ffmpeg) (to convert audio formats) libraries.
 *
 * This module provides APIs to easily download YouTube videos (also supports YouTube Music) and convert them to MP3 format.
 * The output MP3 files are stored in the specified output directory named `download` relatively to the project's root directory.
 *
 * You can download a single YouTube video or a bunch of YouTube videos from a file as audio files and convert them to MP3 format.
 * If you want to download a single YouTube video, please use the {@link module:ytmp3~singleDownload `singleDownload`} function.
 * Or if you want to download a bunch of YouTube videos, first you need to store all YouTube URLs in a file and then use the
 * {@link module:ytmp3~batchDownload `batchDownload`} function to download them by passing the path of the file.
 *
 * @example <caption> Download a single YouTube video </caption>
 * const ytmp3 = require('ytmp3-js');
 * ytmp3.singleDownload('https://www.youtube.com/watch?v=<VIDEO_ID>')
 *   .then(outputFile => console.log('Download complete:', outputFile))
 *   .catch(err => console.error('Download failed:', err));
 *
 * @example <caption> Download a batch of YouTube videos </caption>
 * const ytmp3 = require('ytmp3-js');
 * ytmp3.batchDownload('./urls.txt')
 *   .then(outputFiles => {
 *     for (const outFile of outputFiles) {
 *       console.log('Download complete:', outFile);
 *     }
 *   })
 *   .catch(err => console.error('Download failed:', err));
 *
 * @module    ytmp3
 * @version   2.0.0
 * @requires  audioconv
 * @requires  cache
 * @requires  utils
 * @requires  {@linkcode https://npmjs.com/package/@distube/ytdl-core npm:@distube/ytdl-core}
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     1.0.0
 */

'use strict';

const fs = require('node:fs');               // File system module
const os = require('node:os');               // OS module
const path = require('node:path');           // Path module
const { deprecate } = require('node:util');
const { isAsyncFunction } = require('node:util/types');
const ytdl = require('@distube/ytdl-core');  // Youtube Downloader module
const { ffprobe } = require('fluent-ffmpeg');

const {
  // eslint-disable-next-line no-unused-vars
  Readable  // only for type declaration
} = require('stream');

const {
  LOGDIR,
  log,
  ProgressBar,
  URLUtils,
  TypeUtils,
  InfoUtils,
  ThumbnailUtils,
  FormatUtils,
  createDirIfNotExist,
  createDirIfNotExistSync,
  createLogFile,
  resolveOptions,
  _DownloadOptions, _GetInfoOptions, _AudioConverterOptions,
} = require('./utils');
const {
  checkFfmpeg,
  convertAudio,
  defaultOptions: defaultAudioConvOptions
} = require('./audioconv');
const { VInfoCache, getCachePath } = require('./cache');
const {
  InvalidTypeError,
  IDValidationError
} = require('./error');

/**
 * The video information object.
 *
 * @typedef  {Object}           VideoData
 * @property {ytdl.videoInfo}   info - The video information object retrieved using
 *                                     `ytdl.getInfo()` function.
 * @property {ytdl.videoFormat} format - The chosen audio format for downloading.
 * @property {string}           title - The sanitized title of the video, with illegal
 *                                      characters replaced by underscores.
 * @property {string}           author - The name of the video's author.
 * @property {string}           videoUrl - The URL of the video.
 * @property {string}           videoId - The ID of the video.
 * @property {string}           channelId - The ID of the channel that uploaded the video.
 * @property {number}           viewers - The view count of the video.
 *
 * @private
 * @since    1.0.0
 */

/**
 * This interface represents a handler data object that shared to download handler function
 * during download process.
 *
 * @typedef  {Object} DLHandlerData
 * @property {ytdl.videoInfo} videoInfo - The information about the video.
 * @property {ytdl.videoFormat} videoFormat - The format information of the video.
 * @property {fs.WriteStream} outStream - The output stream for the video.
 * @property {object} [range] - The range information of the video.
 * @property {number} range.start - The start byte of the range.
 * @property {number} range.end - The end byte of the range.
 * @property {string | null} title - The title of the video.
 * @property {string} authorName - The name of the author.
 * @property {string} videoUrl - The URL of the video.
 * @property {string} videoId - The ID of the video.
 * @property {string} channelId - The ID of the channel.
 * @property {string} duration - The duration of the video.
 * @property {number | null} viewers - The view count of the video.
 * @property {number | null} subscribers - The subscriber count of the author's channel.
 * @global
 * @since  2.0.0
 */

/**
 * The download result object returned by the {@link module:ytmp3~download `download`} function.
 *
 * @typedef  {Object} DownloadResult
 * @property {string} path - The full path to the downloaded audio file.
 * @property {string} outputFile - Alias for `path`. Refers to the downloaded audio file.
 * @property {string} url - The URL of the video.
 * @property {object} cache
 * @property {boolean} cache.useCache - Whether the cache is used or not.
 * @property {string | null} cache.id - The unique ID of the cache, or `null` if no cache is used.
 * @property {string | null} cache.path - The full path to the cache file, or `null` if no cache is used.
 * @property {object} metadata - The metadata information of the video.
 * @property {string} metadata.title - The title of the video.
 * @property {string | null} metadata.description - The description of the video.
 * @property {string | null} metadata.publishDate - The publish date of the video.
 * @property {string} metadata.authorUrl - The URL of the video's author.
 * @property {string} metadata.authorName - The name of the video's author.
 * @property {string} metadata.videoId - The ID of the video.
 * @property {string} metadata.channelId - The ID of the channel that uploaded the video.
 * @property {number} metadata.duration - The duration of the video in seconds.
 * @property {number | null} metadata.viewers - The view count of the video.
 * @property {number | null} metadata.subscribers - The subscriber count of the author's channel.
 * @property {string[]} metadata.keywords - The keywords of the video.
 * @property {object} thumbnails - The thumbnails information of the video.
 * @property {ThumbnailObject[]} thumbnails.author - The thumbnails of the video's author.
 * @property {ThumbnailObject[]} thumbnails.video - The thumbnails of the video.
 * @property {ConversionResult | null} conversionResult - The audio conversion result object.
 *
 * @global
 * @since    2.0.0
 */
 

/**
 * An object to configure the download process, including the getting of video information, and audio conversion.
 * It extends the {@link module:utils/options~_YTDLDownloadOptions `ytdl.downloadOptions`} interface from the
 * `@distube/ytdl-core` module, this way you can pass any option of the `ytdl.downloadOptions` object.
 *
 * @typedef  {ytdl.downloadOptions} DownloadOptions
 * @property {string} [cwd='.'] - The current working directory. If not specified, defaults to the current directory.
 *                                Used to resolve relative paths for `outDir`.
 * @property {string} [outDir='.'] - The output directory where downloaded files will be saved.
 *                                   If not specified, defaults to the current directory.
 * @property {string} [outFile] - The output file name for the downloaded audio. If not specified,
 *                                defaults to the sanitized title of the video.
 * @property {boolean} [convertAudio=false] - Whether to enable audio conversion behavior. Defaults to `false`.
 * @property {ConvertAudioOptions} [converterOptions] - The options for audio conversion (requires `convertAudio`).
 *                                                      If not specified, defaults to {@link module:utils/options~defaults.AudioConverterOptions `AudioConverterOptions`}.
 * @property {boolean} [quiet=true] - Whether to suppress all log messages. Defaults to `true`.
 * @property {Function} [handler] - An asynchronous function to handle and customize the download process.
 *                                  If not specified, defaults to {@link module:ytmp3~defaultHandler `defaultHandler`}.
 * @property {ytdl.videoFormat} [format] - The audio format to download. If not specified, defaults to the best audio format.
 * @property {boolean} [useCache=true] - Whether to enable caching video information during the download process. Defaults to `true`.
 *
 * @global
 * @since   1.0.0
 */


// region Constants

/**
 * The library version retrieved directly from `package.json`.
 * @constant
 * @public
 */
const version = require('../package.json').version;

/**
 * The library version information in a frozen object.
 *
 * @property {number} major - The major version number.
 * @property {number} minor - The minor version number.
 * @property {number} patch - The patch version number.
 * @property {string} build - The build information of current version (i.e., stable).
 *
 * @readonly
 * @public
 * @since    1.1.0
 */
// eslint-disable-next-line camelcase
const version_info = (() => {
  const [ major, minor, patch, build ] = version.split(/[.-]/g);
  return Object.freeze({
    __proto__: null,
    major: Number.parseInt(major),
    minor: Number.parseInt(minor),
    patch: Number.parseInt(patch),
    build: !build ? 'stable' : build
  });
})();

// Prevent the 'ytdl-core' module to check updates
Object.assign(process.env, { YTDL_NO_UPDATE: true });

/**
 * The audio format options for the `ytdl.downloadFromInfo()` function.
 * @private
 * @default
 * @type {ytdl.chooseFormatOptions}
 */
const AUDIO_FMT_OPTIONS = {
  quality: 140,
  filter: 'audioonly'
};


// region Helpers


/**
 * Validates a YouTube URL.
 *
 * This function validates a YouTube URL and throws an error if it is not valid.
 *
 * @param  {string | URL} url - The URL to validate.
 * @param  {boolean} [verbose=false] - Whether to log verbose messages or not.
 *
 * @throws {TypeError}          If the URL is not a string nor an instance of `URL`.
 * @throws {Error}              If the input URL is not valid.
 *
 * @package
 * @since  1.0.0
 */
function validateYTURL(url, verbose=false) {
  if (TypeUtils.isNullOrUndefined(url)
      || (!(url instanceof URL) && typeof url !== 'string')) {
    throw new InvalidTypeError('URL must be a string or URL object', {
      actualType: TypeUtils.getType(url),
      expectedType: `'string' | '${TypeUtils.getType(new URL('https://youtube.com'))}'`
    });
  }

  // Parse the given URL string
  url = (typeof url === 'string') ? new URL(url) : url;

  verbose && log.info('Validating URL, please wait...');
  if (URLUtils.validateUrl(url)) {
    verbose && log.done('\x1b[92m\u2714\x1b[0m URL is valid');
  } else {
    verbose && log.error('\x1b[91m\u2716\x1b[0m URL is invalid');
    throw new Error('Invalid URL: ' + url);
  }
}



/**
 * Resolves and validates download options.
 *
 * This function ensures the provided download options are correctly typed and
 * assigns default values where necessary.
 *
 * @param    {Object} options - The options object.
 * @param    {?(DownloadOptions | Object | undefined)} options.downloadOptions
 *           The download options to resolve and validate.
 *
 * @returns {DownloadOptions} The resolved download options. This object can be passed
 *                            safely to {@link module:ytmp3~singleDownload `singleDownload`} or
 *                            {@link module:ytmp3~singleDownload `singleDownload`} function.
 *
 * @throws {TypeError} If the given argument is non-null, but also not an object type.
 *                     And if any of the options have incorrect type.
 *
 * @public
 * @since    1.0.0
 */
function resolveDlOptions({ downloadOptions }) {
  /**
   * Throws a `TypeError` with a message indicating the expected type for a property.
   *
   * @param   {string} prop - The name of the property.
   * @param   {string} type - The actual type of the property.
   * @param   {string} expectedType - The expected type of the property.
   * @throws  {TypeError} Throws a `TypeError` with a descriptive message.
   * @private
   * @since   1.0.0
   */
  function throwErr(prop, type, expectedType) {
    const m = `Unknown type of \`downloadOptions.${prop}\` property. `
      + `Got '${type}', expected is '${expectedType}' type`;
    throw new TypeError(m);
  }
  /**
   * Determines the type of a given value, differentiating between arrays, null, and objects.
   *
   * @param   {any} x - The value to determine the type of.
   * @returns {string} The determined type of the value.
   * @private
   * @since   1.0.0
   */
  function getTypeOf(x) {
    // `typeof []` and `typeof null` are always returns 'object', which is ambiguous
    return Array.isArray(x) ? 'array' : ((x === null) ? 'null' : typeof x);
  }

  // Throw an error if the given options is not an object
  if (downloadOptions && (
    Array.isArray(downloadOptions) || typeof downloadOptions !== 'object')
  ) {
    throw new TypeError('Unknown type of `downloadOptions`: ' + typeof downloadOptions);
  }

  const cwd = (downloadOptions?.cwd && typeof downloadOptions.cwd !== 'string')
    && throwErr('cwd', getTypeOf(downloadOptions.cwd), 'string')
    || (downloadOptions?.cwd
      ? (path.isAbsolute(downloadOptions.cwd)
        ? downloadOptions.cwd
        : path.resolve(downloadOptions.cwd)
      )
      : path.resolve('.')  // Fallback value
    );

  // Ensure it is an object
  downloadOptions = (!downloadOptions) ? {} : downloadOptions;
  return {
    // ==> downloadOptions.cwd
    cwd,
    // ==> downloadOptions.outDir
    outDir: (
      (downloadOptions.outDir && typeof downloadOptions.outDir !== 'string')
        && throwErr('outDir', getTypeOf(downloadOptions.outDir), 'string')
        || (downloadOptions.outDir
          ? (path.isAbsolute(downloadOptions.outDir)
            // If the specified `outDir` is an absolute path,
            // do not resolve the path to relative to the `cwd`
            ? downloadOptions.outDir
            : path.join(cwd, downloadOptions.outDir)
          )
          : path.resolve('.')  // Fallback value
        )
    ),
    // ==> downloadOptions.convertAudio
    convertAudio: (
      TypeUtils.isNullOrUndefined(downloadOptions.convertAudio)
        ? true  // Fallback value
        : (downloadOptions.convertAudio && typeof downloadOptions.convertAudio !== 'boolean')
          && throwErr('convertAudio', getTypeOf(downloadOptions.convertAudio), 'boolean')
          || downloadOptions.convertAudio
    ),
    // ==> downloadOptions.converterOptions
    converterOptions: (
      ((downloadOptions.converterOptions
        && (
          Array.isArray(downloadOptions.converterOptions)
          || typeof downloadOptions.converterOptions !== 'object'
        ))
        && throwErr('converterOptions', getTypeOf(downloadOptions.converterOptions), 'object')
        || downloadOptions.converterOptions
      ) || defaultAudioConvOptions  // Fallback value
    ),
    // ==> downloadOptions.quiet
    quiet: (
      TypeUtils.isNullOrUndefined(downloadOptions.quiet)
        ? false  // Fallback value
        : (downloadOptions.quiet && typeof downloadOptions.quiet !== 'boolean')
          && throwErr('quiet', getTypeOf(downloadOptions.quiet), 'boolean')
          || downloadOptions.quiet
    ),
    // ==> downloadOptions.useCache
    useCache: (
      TypeUtils.isNullOrUndefined(downloadOptions.useCache)
        ? true  // Fallback value
        : (downloadOptions.useCache && typeof downloadOptions.useCache !== 'boolean')
          && throwErr('useCache', getTypeOf(downloadOptions.useCache), 'boolean')
          || downloadOptions.useCache
    )
  };
}

/**

/**
 * Sanitizes a filename by replacing invalid characters with underscores.
 *
 * The following characters are considered invalid in filenames and will be replaced: `/\:*?"|<>`
 *
 * @param {string} filename - The original filename to be sanitized.
 * @returns {string} - The sanitized filename with invalid characters replaced by underscores.
 */
function sanitizeFilename(filename) {
  const invalidCharsRegex = /[/\\:*?"|<>]/g;
  return filename.replace(invalidCharsRegex, '_');
}


async function isDownloaded(path, vInfo) {
  return await new Promise((resolve) => {
    ffprobe(path, (err, meta) => {
      if (err) {
        resolve(false);
      } else {
        resolve(Math.floor(parseInt(meta.format.duration)) === Math.floor(
          InfoUtils.getDuration(vInfo)));
      }
    });
  });
}

/**
 * Handles the interruption of the download process.
 * 
 * This function is triggered when the download process is interrupted.
 * It clears the current line in the console, logs an error message, and
 * then attempts to destroy the `ytdlStream` if it is not already destroyed.
 * Finally, it exits the process with a status code of 130 (`SIGINT`).
 * 
 * @private
 */
function downloadInterruptedHandler({ quiet, ytdlStream }) {
  quiet || process.stdout.write('\n');
  quiet || log.error('Program interrupted. Exiting now ...');
  setImmediate(() => {
    // It consumes the `ytdlStream` variable and destroy if it is not destroyed yet,
    // thus need to ensure the variable is declared in the outside scope before call
    if (ytdlStream && !ytdlStream.destroyed) {
      ytdlStream.destroy && ytdlStream.destroy(new Error('Interrupted'));
      quiet || log.debug('[SIGTERM] Terminated the download process');
    }
    process.exit(130);  // SIGINT
  });
}

async function convertDownloadedAudio(path, options, quiet) {
  let result = null;
  try {
    // Convert the audio file
    result = await convertAudio(path, options);
  } catch (e) {
    const messages = e.message.split('\n');
    e.message = `${messages[0]}\n${messages[messages.length - 1]}`;

    quiet || log.error(
      '\x1b[91m\u2716\x1b[0m Upss! An error occurred during audio conversion');
    quiet || console.error(`\x1b[91m${e.name}: ${e.message}\x1b[0m`);
    quiet || log.info('Skipping audio conversion for this file ...');
    throw e;
  }
  return result;
}

/**
 * Fetches video information and format from a given URL.
 *
 * @param {string} url - The URL of the video to fetch information for.
 * @param {object} options - Options to pass to the `getInfo` function.
 * @param {boolean} [quiet=false] - If `true`, suppresses error logging.
 * @returns {Promise<object>} - Fulfills with an object containing video information and format.
 *
 * @throws {Error} - Throws an error if the fetch process fails.
 *
 * @private
 * @since 2.0.0
 */
async function fetchVideoInfo(url, options, quiet=false) {
  try {
    const videoInfo = await getInfo(url, options);
    const videoFormat = FormatUtils.parseFormatObject(
      ytdl.chooseFormat(videoInfo.formats, AUDIO_FMT_OPTIONS));
    return { videoInfo, videoFormat };
  } catch (e) {
    quiet || log.error('\x1b[91m\u2716\x1b[0m Upss! An error occurred during pre-download process');
    throw e;  // Needs to be handled
  }
}

/**
 * Constructs an object containing download data for a video.
 *
 * @param {object} data
 * @param {ytdl.videoInfo} data.videoInfo - The information about the video.
 * @param {ytdl.videoFormat} data.videoFormat - The format information of the video.
 * @param {AuthorInfo} data.authorInfo - The information about the author.
 * @param {fs.WriteStream} outStream - The output stream for the video.
 *
 * @returns  {DLHandlerData} An object containing the download data.
 *
 * @private
 * @since 2.0.0
 */
function constructDownloadData(outStream, data, options) {
  return {
    videoInfo: data.videoInfo,
    videoFormat: data.videoFormat,
    outStream,
    range: options.range,
    title: InfoUtils.getTitle(data.videoInfo),
    authorName: data.authorInfo.name,
    videoUrl: data.videoInfo.videoDetails.video_url,
    videoId: data.videoInfo.videoDetails.videoId,
    channelId: data.videoInfo.videoDetails.channelId,
    duration: InfoUtils.getDuration(data.videoInfo),
    viewers: InfoUtils.getViewers(data.videoInfo),
    subscribers: InfoUtils.getSubscribers(data.authorInfo)
  };
}

/**
 * Constructs a download result object.
 *
 * @param {string} url - The URL of the video.
 * @param {string} outputFile - The path to the output file.
 * @param {DLHandlerData} data - The download data.
 *
 * @returns {DownloadResult} The download result object.
 *
 * @private
 * @since 2.0.0
 */
function constructDownloadResult(url, outputFile, data, options) {
  return {
    path: outputFile,
    outputFile,
    url,
    cache: {
      useCache: options.useCache,
      id: options.useCache ? URLUtils.extractVideoId(url) : null,
      path: options.useCache ? getCachePath(data.videoId) : null
    },
    metadata: {
      title: data.title,
      description: InfoUtils.getDescription(data.videoInfo),
      publishDate: InfoUtils.getPublishDate(data.videoInfo),
      authorUrl: data.authorInfo.url,
      authorName: data.authorName,
      videoId: data.videoId,
      channelId: data.channelId,
      duration: data.duration,
      viewers: data.viewers,
      subscribers: data.subscribers,
      keywords: InfoUtils.getKeywords(data.videoInfo)
    },
    thumbnails: {
      author: ThumbnailUtils.sortThumbnailsByResolution(data.authorInfo.thumbnails),
      video: ThumbnailUtils.getVideoThumbnails(data.videoInfo.videoDetails, true)
    },
    conversionResult: null
  };
}


// region Core Functions


/**
 * Retrieves information for multiple YouTube videos sequentially.
 *
 * **Deprecated**: Please use {@link module:ytmp3~getInfo `getInfo`} instead for better
 * video information retrieval.
 *
 * This function accepts multiple YouTube URLs and retrieves information for each
 * video sequentially. It processes each URL one by one, ensuring that the next
 * URL is processed only after the previous one is complete.
 *
 * @param {...(string | URL)} urls - The YouTube video URLs to fetch information
 *                                   for. Each URL can be either a string or a URL object.
 * @returns {Promise<ytdl.videoInfo[]>} A promise that resolves to an array of video
 *                                      information objects.
 * @throws {Error} If any of the provided URLs are invalid, validated using
 *                 `validateURL` function from `ytdl-core` module.
 *
 * @example
 * const videoUrls = [
 *   'https://www.youtube.com/watch?v=abcd1234',
 *   'https://www.youtube.com/watch?v=wxyz5678'
 * ];
 * 
 * getVideosInfo(...videoUrls).then(videoInfos => {
 *   console.log(videoInfos);
 * }).catch(error => {
 *   console.error('Error fetching video info:', error);
 * });
 *
 * @async
 * @public
 * @since  0.2.0, 2.0.0
 * @deprecated
 * @see {@link module:ytmp3~getInfo}
 */
async function getVideosInfo(...urls) {
  if (!urls) return [];
  urls = urls.filter(url => !!url);
  const results = [];

  for (let url of urls) {
    url = (url instanceof URL) ? url.href : url?.trim();
    if (!URLUtils.validateUrl(url)) throw new URIError(`Invalid URL: ${url}`);
    results.push((await ytdl.getInfo(url)));
  }
  return results;
}

/**
 * Retrieves the YouTube video information from the given YouTube URL(s) or ID(s).
 *
 * If the given URL is an array either of strings or `URL` objects, the function will
 * returns an array fullfilled with the video information from each URLs (except
 * `options.asObject` is set to `true`). The function will automatically filter out any
 * nullable values (`null`, `undefined` or an empty string) from the array, if provided.
 *
 * For more flexibility, this function also accepts video ID to `url` parameter. In this case,
 * the function will returns the video information for the given video ID.
 *
 * This function will able to create and retrieve a cache of video information for faster
 * access by enabling the `options.useCache` option. The cache file will be created in the
 * YTMP3's cache directory, see {@link module:cache~VINFO_CACHE_PATH `VINFO_CACHE_PATH`}.
 * If the cache not found or `options.useCache` is set to `false`, the function will
 * ignore the cache and fetch the video information from the server, and if the `options.useCache`
 * is set to `true`, the function will store the cache for later retrieval the video information.
 *
 * @param {string | URL | Array.<string | URL>} url - The YouTube video URL(s) or ID(s) to retrieve its information.
 * @param {ytdl.getInfoOptions} [options] - Options to use when fetching the video information.
 *                                          This options object is extend to the `ytdl.getInfoOptions` object.
 * @param {boolean} [options.asObject] - If set to `true`, the returned value will be an object
 *                                       with video ID as keys and video information object as values.
 *                                       Otherwise, the returned value will be an array of video
 *                                       information objects. This option will be ignored if the
 *                                       `url` is not an array.
 * @param {boolean} [options.useCache] - If set to `true`, the function will use the cache to
 *                                       retrieve the video information. Otherwise, the function
 *                                       will ignore the cache and fetch the video information
 *                                       from the server. This also will make the function to create a
 *                                       new cache file in the YTMP3's cache directory.
 * @param {boolean} [options.verbose=false] - Whether to print the process retrieval to standard output. Defaults to `false`.
 *
 * @returns {Promise.<ytdl.videoInfo | Array.<ytdl.videoInfo> | Record.<string, ytdl.videoInfo>>}
 *          A promise fulfills with a video information. If the `url` is an array, returned value
 *          will be an array of video information(s), or if the `options.asObject` is set to `true`,
 *          the returned value will be an object with video ID as keys and video information object as values.
 *
 * @async
 * @public
 * @since   2.0.0
 */
async function getInfo(url, options={}) {
  // Filter the URL
  const urls = (Array.isArray(url) ? url : [ url ]).filter(url => !!url);
  if (!urls.length) return [];  // Return early if no URLs provided

  // ==========================================
  //  Pre-fetch Process
  // ==========================================

  const validUrls = [];
  urls.forEach((u, idx) => {
    options.verbose &&
      process.stdout.write('\x1b[K\x1b[1;93m[...]\x1b[0m Validating input URLs ... '
        + `\x1b[94m[${validUrls.length}/${urls.length}]\x1b[0m\r`);
    u = (u instanceof URL) ? u.href : u.trim();
    // Check if the `url` parameter is specified with video ID
    if (!/^https?:\/\/.+/.test(u)) {
      // Throw an error if the given video ID is invalid
      if (!URLUtils.validateId(u)) {
        throw new IDValidationError('Invalid YouTube video ID');
      }
      // Construct a new YouTube URL from given ID
      u = `https://youtu.be/${u}`;
      urls[idx] = u;  // Update the URL
    }
    if (URLUtils.validateUrl(u)) validUrls.push(u);
  });

  if (options.verbose) {
    process.stdout.write('\x1b[K\r');
    if (urls.length === validUrls.length) {
      process.stdout.write('\x1b[92m[DONE]\x1b[0m ');
    } else {
      process.stdout.write('\x1b[91m[DONE]\x1b[0m ');
    }
    process.stdout.write(
      `Validating input URLs \x1b[94m[${validUrls.length}/${urls.length}]\x1b[0m\n`);
  }

  if (!TypeUtils.isPlainObject(options)) {
    throw new InvalidTypeError('Options must be a plain object', {
      actualType: TypeUtils.getType(options),
      expectedType: TypeUtils.getType({})
    });
  }

  const { asObject, useCache } = options;
  const videoIDs = urls.map(u => URLUtils.extractVideoId(u));
  // No more used
  delete options.asObject;
  delete options.useCache;

  // ==========================================
  //  Fetch Process
  // ==========================================

  const infos = [];
  for (const [u, id] of urls.map((u, index) => [u, videoIDs[index]])) {
    let haveCache = false;  // To indicate that current video ID has been cached before
    // Get the video information from cache first if available and `useCache` is set to `true`
    let cache = null;
    let info = null;
    const idC = `{\x1b[36m${id}\x1b[0m}`;

    if (useCache) {
      options.verbose && log.info(`${idC}: Using video information from cache ...`);
      cache = await VInfoCache.getCache(id, { debug: options.verbose });
    }

    if (cache && useCache) {
      // Check if the cache has expired
      if (cache.hasExpired) {
        options.verbose
          && log.info(`${idC}: Cache is available but has been expired`);
        haveCache = false;
        // Delete the expired cache
        if (await VInfoCache.deleteCache(id)) {
          options.verbose && log.debug(`${idC}: Cache has been deleted successfully`);
        } else {
          options.verbose
            && log.debug(`${idC} has been deleted with failure. Skipping ...`);
        }
      } else {
        info = cache.videoInfo;
        haveCache = true;  // Current video ID has cache
      }
    }

    if (useCache) {
      options.verbose && log.info(`${idC}: Cache status: `
        + ((cache && !cache.hasExpired) ? '\x1b[32mAvailable' : '\x1b[31mUnavailable') + '\x1b[0m');
    }

    // If the video information is not found in cache, fetch it from YouTube server instead
    if (!info) {
      try {
        options.verbose && log.info(`${idC}: Fetching video info from server ...`);
        info = await ytdl.getInfo(u, options);
      } catch (e) {
        options.verbose && log.error(
          '\x1b[91m\u2716\x1b[0m Upss! An error occurred while fetching video information');
        throw e;
      }
    }

    // Create a cache for the video info
    const playable = info?.player_response?.playabilityStatus?.status === 'OK';
    if (!playable && options.verbose) {
      log.warn(`${idC}: Content from the current ID is unplayable`);
    }

    if (useCache && !haveCache && playable) {
      await VInfoCache.createCache(info);
      options.verbose && log.done(`${idC}: Cache created successfully`);
    }
    infos.push(info);  // Add the video information to the array
  }

  // ==========================================
  //  Post-fetch Process
  // ==========================================

  if (Array.isArray(url) && asObject) {
    // Create an object containing the video information objects
    // with video ID as keys and video information object as values
    return infos.reduce((acc, val) => {
      acc[videoIDs[infos.indexOf(val)]] = val;
      return acc;
    }, {});
  }

  // Return the array if the `url` is an array, otherwise return the first video info
  return Array.isArray(url) ? infos : (infos[0] || null);
}

/**
 * Writes error details and associated video information to a log file.
 *
 * This function creates or appends to a log file in the {@link module:utils~LOGDIR `LOGDIR`}
 * directory, logging the error message along with relevant video data. If the log file is empty
 * after writing, it will be deleted, and the function returns `false`. Otherwise, it 
 * returns `true` to indicate successful logging.
 *
 * The error message is written to the log file in the following format:
 *
 * ```txt
 * [ERROR] <error message>
 *   Title: <video title>
 *   Author: <video author>
 *   Channel ID: <video channel ID>
 *   Viewers: <video viewers>
 *   URL: <video URL>
 * ---------------------------------------------
 * ```
 *
 * Immediately return `false` if the given log file name is invalid. The error log
 * will be in the {@link module:utils~LOGDIR `LOGDIR`} directory.
 *
 * @param {string} logfile - The name of the log file where the error details should be written.
 * @param {VideoData | Object} videoData - An object containing information about the video associated
 *                                         with the error.
 * @param {Error} [error] - The error object, optional. If not provided,
 *                          an error message will be `'Unknown error'`.
 *
 * @returns {Promise<boolean>} A promise that resolves to `true` if the log was written
 *                             successfully, otherwise `false`.
 *
 * @async
 * @package
 * @since  1.0.0
 */
async function writeErrorLog(logfile, videoData, error) {
  if (!logfile || typeof logfile !== 'string') return false;

  logfile = path.join(LOGDIR, path.basename(logfile));
  createDirIfNotExistSync(LOGDIR);

  return new Promise((resolve, reject) => {
    const logStream = fs.createWriteStream(logfile, { flags: 'a+', flush: true });
  
    // Write the necessary video information to the log file
    logStream.write(`[ERROR] ${error?.message || 'Unknown error'}${os.EOL}`);
    logStream.write(`   Title: ${videoData.title}${os.EOL}`);
    logStream.write(`   Author: ${videoData.author}${os.EOL}`);
    logStream.write(`   Channel ID: ${videoData.channelId}${os.EOL}`);
    logStream.write(`   Viewers: ${videoData.viewers}${os.EOL}`);
    logStream.write(`   URL: ${videoData.videoUrl}${os.EOL}`);
    logStream.write(`---------------------------------------------${os.EOL}`);
    logStream.end(os.EOL);

    logStream.on('finish', () => resolve(true));
    logStream.on('error', (err) => {
      if (!logStream.destroyed) logStream.destroy();
      reject(err);
    });
  });
}


/**
 * Downloads audio from multiple YouTube videos sequentially.
 *
 * @param  {...(string | URL)} urls - The URLs to download audio from.
 *                                    Each URL can be a string or a URL object.
 * @yields {Promise<object>} A promise that resolves to an object containing
 *                                   video information, video data, and a download stream.
 *
 * @async
 * @generator
 * @package
 * @since   1.0.0
 */
async function* downloadAudio(...urls) {
  // Map the URLs to strings, converting URL objects
  // to strings and trimming whitespace
  urls = urls.map((url) => ((url instanceof URL) ? url.href : url).trim());

  // Regex to replace illegal characters in file names with underscores
  const illegalCharRegex = /[<>:"/\\|?*]/g;

  // Fetch video information for each URL
  for (const info of (await getVideosInfo(...urls))) {
    /**
     * @ignore
     * @type {VideoData}
     */
    const data = {
      info,
      format: ytdl.chooseFormat(info.formats, AUDIO_FMT_OPTIONS),
      title: info.videoDetails.title.replace(illegalCharRegex, '_'),
      author: info.videoDetails.author.name,
      videoUrl: info.videoDetails.video_url,
      videoId: info.videoDetails.videoId,
      channelId: info.videoDetails.channelId,
      viewers: info.videoDetails.viewCount
    };

    // Yield the video information, processed data, and download stream
    yield Object.freeze({
      videoInfo: info,
      videoData: data,
      download: ytdl.downloadFromInfo(data.info, {
        format: data.format
      })
    });
  }
}


/**
 * 
 * @param {!Readable} readable - The readable stream to process.
 * @param {Object} data - The data object containing video information, video data, and an output stream.
 * @param {VideoData} data.videoData - The processed video data.
 * @param {fs.WriteStream} data.outStream - The output stream to write to.
 * @param {string} data.errLogFile - The error log file for logging errors during download.
 * @param {ProgressBar} data.progressBar - The progress bar object.
 * @param {boolean} verbose - Whether to display progress bar and error message to the terminal or not.
 *
 * @async
 * @package
 * @since  1.0.0, 2.0.0
 * @deprecated
 */
async function downloadHandler(readable, data, verbose=false) {
  data = (!data) ? {} : data;  // Ensure data is an object
  await new Promise((resolve, reject) => {
    // Set up event listeners for the download stream
    readable
      .on('progress', (_chunk, bytesDownloaded, totalBytes) => {
        verbose && process.stdout.write(
          data.progressBar.create(bytesDownloaded, totalBytes));
      })
      .on('end', () => {
        verbose && log.done(`Download finished: \x1b[93m${data.videoData.title}\x1b[0m`);
        resolve();
      })
      .on('error', (err) => {
        verbose && log.error(`Download failed: ${data.videoData.title}`);

        // Close the output stream if it's still open
        data.outStream.closed || data.outStream.close();
        writeErrorLog(data.errLogFile, data.videoData, err).then(() => reject(err));
      })
      .pipe(data.outStream);
  });

  // Handle the output file stream
  data.outStream
    .on('error', (err) => {
      if (verbose) {
        log.error(`Unable to write to file: ${data.outStream.path}`);
        console.error(`Caused by: ${err.message}\n`);
      }
      if (fs.existsSync(data.outStream.path)) {
        // Delete the incomplete download file if exists
        fs.rmSync(data.outStream.path);
      }
      throw err;
    });
}

/**
 * Handles the download process, including progress updates, error handling, and completion notification.
 *
 * @param {ReadableStream} stream - The readable stream to download from.
 * @param {object} data - Metadata of the video content.
 * @param {string} data.title - The title of the video.
 * @param {fs.WriteStream} [data.outStream] - The output stream to write to.
 * @param {object} options - Options for the download process.
 * @param {boolean} [options.quiet=false] - If true, suppresses log output.
 * @param {boolean} [options.verbose=false] - If true, enables verbose logging.
 * @param {string} [options.outDir='.'] - The output directory for the downloaded file.
 * @param {string} [options.outFile] - The name of the output file.
 * @param {Object} [options.range] - The range of bytes to download.
 *
 * @returns {Promise<void>}
 *
 * @throws {Error} If an error occurs during the download process.
 *
 * @async
 * @package
 * @since 2.0.0
 */
async function defaultHandler(stream, data, options) {
  function onProgress(_chunk, downloaded, total) {
    options.quiet || process.stdout.write(pb.create(downloaded, total));
  }
  function onError(err, reject) {
    options.quiet
      || log.error(`\x1b[91m\u2716\x1b[0m Download failed: \x1b[93m${data.title}\x1b[0m`);
    reject(err);
  }
  function onEnd(resolve) {
    options.quiet
      || log.done(
        `\x1b[92m\u2714\x1b[0m Download completed: \x1b[93m${data.title}\x1b[0m`);
    options.quiet || log.info(`File saved to: \x1b[93m${outStream.path}\x1b[0m`);
    resolve();
  }

  data = data || {};
  const pb = new ProgressBar();
  const outDir = path.resolve(options.outDir || '.');
  const outStream = data.outStream || fs.createWriteStream(
    path.join(outDir, options.outFile), {
      flags: 'a+',
      range: options.range
    }
  );

  // File stream handler
  if (!data.outStream) {
    outStream.on('error', function outStreamErrorHandler(err) {
      options.verbose
        && log.error(`I/O error: Unable to write to output file: ${outStream.path}`);
      throw err;
    });
  }

  await new Promise((resolve, reject) => {
    stream
      .on('progress', onProgress)
      .on('error', (err) => onError(err, reject))
      .on('end', () => onEnd(resolve))
      .pipe(outStream);
  });
}

/**
 * Downloads audio from a YouTube video using the provided video URL or video ID.
 *
 * This function performs the entire process of downloading YouTube audio, including:
 * - Validating and resolving the input (URL or video ID).
 * - Fetching video metadata and selecting the best available audio format.
 * - Managing file naming, sanitization, and output directory resolution.
 * - Handling download interruptions and ensuring safe termination.
 * - Writing the downloaded data to a file with proper error handling.
 * - Optionally converting the downloaded audio format.
 *
 * The function retrieves video metadata from YouTube, checks for available audio formats,
 * and downloads the content in AAC (Advanced Audio Coding) format by default. The file is 
 * saved in the current directory unless `options.outDir` is specified.
 *
 * ### Customizing the Download Process
 *
 * If you want to change the behavior of the download process, you can provide a custom 
 * `options.handler` function to handle the download stream and log messages. The handler 
 * function accepts 3 arguments: a `ReadableStream` instance, the video metadata object, and the options object.
 * The handler function can be a synchronous or asynchronous function that returns a promise, both of them are
 * handled properly by this function. But it is recommended to use an asynchronous function, as it might
 * cause to blocking of the main thread if the handler function is synchronous.
 *
 * ### Caching Behavior
 * By default, video metadata is cached in YTMP3’s cache directory to optimize subsequent downloads.
 * This behavior can be disabled by setting `options.useCache` to `false`, which forces the function
 * to always fetch fresh metadata from the YouTube server. Disabling this option also prevents the 
 * function from creating or updating any cached data for the given video.
 *
 * ### Cache Expiration
 * Cached video metadata expires after 2 hours (7200 seconds or 7.2×10⁵ milliseconds). Once expired, 
 * the function attempts to verify cache validity by sending a HEAD request to YouTube. If the response 
 * status is `200 OK`, the cached data is used instead of fetching new metadata. Otherwise, fresh data 
 * is retrieved and the cache is updated.
 *
 * @param {string | URL} url - A YouTube video URL or video ID to download its audio content.
 * @param {DownloadOptions} [options] - Options to configure the video information retrieval and download process.
 *
 * @returns {Promise<DownloadResult>} Fulfills with an object containing download metadata and file paths.
 *
 * @throws {IDValidationError} If the provided video ID is invalid.
 * @throws {InvalidTypeError} If options are not a valid object.
 * @throws {Error} If an error occurs during fetching, downloading, or writing the file.
 *
 * @async
 * @public
 * @since  2.0.0
 */
async function download(url, options) {
  // Check if the `url` is a URL represents in a string or URL object
  if ((typeof url === 'string' && /^https?:\/\//.test(url)) || url instanceof URL) {
    url = (url instanceof URL) ? url.href : url.trim();
  // ... or if the given input is a video ID
  } else if (typeof url === 'string' && url.length === URLUtils.MAX_ID_LENGTH) {
    url = (new URL(url, 'https://youtu.be')).href;
  // ... otherwise the input is treated as invalid video ID
  } else {
    throw new IDValidationError(`Given video ID is invalid: ${url}`);
  }

  if (typeof options !== 'undefined' && !TypeUtils.isPlainObject(options)) {
    throw new InvalidTypeError('Options must be a plain object', {
      actualType: TypeUtils.getType(options),
      expectedType: TypeUtils.getType({})
    });
  }

  // * DO NOT ALLOW auto-conversion when using API directly, and
  // * make the process all quiet; unless user specified
  options = { convertAudio: false, quiet: true, ...options };

  // Extract the video ID
  const videoId = URLUtils.extractVideoId(url);
  // Resolve the download options
  const resolvedDlOptions = resolveOptions(options, {
    ..._DownloadOptions,
    handler: ['function', defaultHandler]  // Override with default handler if unspecified
  }, true);
  const { quiet: dlQuiet, handler, range, outDir } = resolvedDlOptions;
  let { outFile } = resolvedDlOptions;
  let quiet = dlQuiet, allQuiet;
  let ytdlStream = null;  // Declare first

  if (typeof dlQuiet === 'string' && dlQuiet === 'all') {
    quiet = true;
    allQuiet = true;
  }

  // Resolve the get info options
  const resolvedInfoOptions = resolveOptions(
    { ...resolvedDlOptions, verbose: !quiet }, _GetInfoOptions);

  // ==========================================
  //  Pre-download Process
  // ==========================================

  // Rebuild the interruption (SIGINT) handler
  const interruptionHandler = function () {
    downloadInterruptedHandler({ quiet, ytdlStream });
  };

  // Attach the SIGINT handler
  process.once('SIGINT', interruptionHandler);

  // Get the video information
  const { videoInfo, videoFormat } = await fetchVideoInfo(
    url, resolvedInfoOptions, quiet);

  outFile = (typeof outFile === 'string' && outFile.trim().length > 0)
    ? outFile.trim()
    : videoInfo.videoDetails.title + '.m4a';
  // Resolve extension file and sanitize the file name
  outFile = sanitizeFilename((!/.+\.\w+$/.test(outFile) ? `${outFile}.m4a` : outFile));
  const output = path.resolve(outDir.trim() || '.', outFile);

  let flags = 'w';
  if ((await isDownloaded(output, videoInfo))
      && (TypeUtils.isPlainObject(range) && typeof range.start === 'number')) {
    flags = 'a+';
  }

  // Create the output directory if it doesn't exist
  await createDirIfNotExist(outDir);

  const outStream = fs.createWriteStream(output, { flags, range });
  outStream.on('error', function errHandler(err) {
    quiet
      || log.error(`I/O error: (${err.errno}) Unable to write to file: ${outFile}`);
    // Delete the file if there is no bytes written yet
    if (outStream.bytesWritten === 0) fs.unlinkSync(outStream.path);
    throw err;
  });

  const authorInfo = InfoUtils.getAuthor(videoInfo);
  const data = constructDownloadData(
    outStream,
    { videoInfo, videoFormat, authorInfo },
    resolvedDlOptions
  );

  try {
    if (!quiet) {
      if (TypeUtils.isPlainObject(range) && typeof range.start === 'number') {
        const mb = range.start === 0
          ? range.start : (range.start / (1024 ** 2)).toFixed(3);
        log.info(`{\x1b[36m${videoId}\x1b[0m}: `
          + `Resume downloading from bytes [\x1b[96m${range.start} B//${mb} MiB\x1b[0m]`);
      } else {
        log.info(`{\x1b[36m${videoId}\x1b[0m}: Downloading the audio content ...`);
      }
    }

    // Download the audio using the video information
    ytdlStream = ytdl.downloadFromInfo(data.videoInfo, {
      ...resolvedDlOptions,
      format: TypeUtils.isNullOrUndefined(resolvedDlOptions.format)
        ? videoFormat
        : resolvedDlOptions.format
    });
  } catch (e) {
    quiet || log.error(
      '\x1b[91m\u2716\x1b[0m Upss! An error occurred while downloading the audio');
    throw e;
  }

  const resolvedHandlerOptions = resolveOptions(resolvedDlOptions, {
    quiet: ['boolean', (allQuiet || quiet)],
    outDir: ['string', outDir],
    outFile: ['string', outFile]
  });

  // Call the handler
  if (isAsyncFunction(handler)) {
    await handler(ytdlStream, data, resolvedHandlerOptions);
  } else {
    handler(ytdlStream, data, resolvedHandlerOptions);
  }

  // ==========================================
  //  Post-download Process
  // ==========================================

  // Detach the SIGINT handler
  process.off('SIGINT', interruptionHandler);

  // Create the download result object
  const downloadResult = constructDownloadResult(
    url,
    output,
    { ...data, videoInfo, authorInfo },
    resolvedDlOptions
  );

  // Convert the downloaded audio if specified
  // ! The auto-conversion behavior only for CLI usage
  if (resolvedDlOptions.convertAudio) {
    downloadResult.conversionResult = await convertDownloadedAudio(output, resolveOptions(
      {
        ...resolvedDlOptions.converterOptions,
        quiet: allQuiet ? true : (typeof resolvedDlOptions.converterOptions.quiet === 'undefined'
          ? resolvedDlOptions.converterOptions.quiet : true)
      },
      _AudioConverterOptions
    ));
    resolvedDlOptions.converterOptions.quiet || log.info(
      `New audio file: \x1b[93m${downloadResult.conversionResult.output.path}\x1b[0m`);
  }

  return downloadResult;
}

/**
 * Downloads audio from a single YouTube URL and saves it to the output directory.
 *
 * **Deprecated**: Please use {@link module:ytmp3~download `download`} instead.
 *
 * @param   {!(string | URL)}  inputUrl - The URL of the YouTube video to download audio from.
 * @param   {?(DownloadOptions | object)} [downloadOptions]
 *          Options to configure the download process. If not specified, it will automatically uses default options.
 *
 * @returns {Promise<string>}          A promise that resolves a string representating
 *                                     the output file when the download completes
 *                                     or rejects if an error occurs.
 *
 * @throws {Error} If there is an error occurs during download process.
 * @throws {TypeError} If the input URL is not a string nor an instance of URL.
 *
 * @example
 * singleDownload('https://www.youtube.com/watch?v=<VIDEO_ID>')
 *   .then(outFile => console.log(outFile))
 *   .catch(err => console.error('Download failed:', err));
 *
 * @async
 * @public
 * @since       1.0.0, 2.0.0
 * @deprecated
 * @see         {@link module:ytmp3~download}
 */
async function singleDownload(inputUrl, downloadOptions) {
  inputUrl = (inputUrl instanceof URL) ? inputUrl.href : inputUrl?.trim();  // Trim any whitespace
  downloadOptions = resolveDlOptions({ downloadOptions });
  const { quiet } = downloadOptions;
  const progressBar = new ProgressBar();  // Initialize progress bar with default options

  // Check if the output directory exists
  await createDirIfNotExist(downloadOptions.outDir);

  // Validate the given URL
  validateYTURL(inputUrl, !quiet);

  quiet || log.info('Processing the video data...');
  const gen = downloadAudio(inputUrl);
  // Get the video information and download stream
  const { videoData, download } = (await gen.next()).value;

  // Create a write stream for the output file
  const outStream = fs.createWriteStream(
    path.join(downloadOptions.outDir, `${videoData.title}.m4a`));
  const errLogFile = createLogFile();  // Create a log file

  quiet || log.info(`Starting download \x1b[93m${videoData.title}\x1b[0m ...`);

  try {
    await downloadHandler(download, {
      videoData, outStream,
      errLogFile, progressBar
    }, !quiet);
  } catch (err) {
    const errLog = path.join(LOGDIR, path.basename(errLogFile));
    if (!quiet && fs.existsSync(errLog)) {
      log.error(`Error log written to: \x1b[93m${errLog}\x1b[0m`);
    }
    throw err;
  }

  if (downloadOptions.convertAudio) {
    if (await checkFfmpeg(false)) {
      try {
        // For the last touch, convert the downloaded audio to MP3 format
        await convertAudio(outStream.path, downloadOptions.converterOptions);
      } catch (err) {
        if (!quiet) {
          log.error(err.message);
          console.error(err.stack);
          log.warn('Skipping audio conversion for this file');
        }
      }
    } else {
      quiet || log.warn('ffmpeg not found, unable to convert audio to specific format');
    }
  }
  return outStream.path;  // Return the output file path, only if succeed
}


/**
 * Downloads audio from a file containing YouTube URLs and saves them to the output directory.
 *
 * This function is similar to {@link module:ytmp3~download `download`} but accepts a file containing
 * a list of YouTube URLs as input. If the given file is empty or does not exist, an error will be thrown.
 *
 * As of version 1.0.0, this function has been enhanced and made more robust, aiming at the download process.
 * Previously, it only downloaded the first 15 URLs from the given file. Now, it downloads all of them sequentially.
 * The function can now handle an unlimited number of URLs, downloading them one by one (also known as,
 * sequential download) instead of all at once. Additionally, the download progress bar has been reworked
 * to display more precise and colorful information in the terminal, providing users with better insights
 * into the download process, and also more better and improved errors handling.
 *
 * @param   {fs.PathLike} file - The path to the file containing YouTube URLs.
 * @param   {DownloadOptions} [downloadOptions]
 *          Options to configure the download process. If not specified, it will automatically uses default options.
 *
 * @returns {Promise<string[]>} A promise that resolves to an array of strings representing the
 *                              successfully downloaded files or rejects if an error occurs.
 * 
 * @throws {Error} If the file does not exist or is empty, and if there is an error
 *                 occurs during download process.
 * 
 * @example
 * batchDownload('/path/to/urls.txt')
 *   .then(outFiles => console.log(outFiles))
 *   .catch(err => console.error('Download failed:', err));
 * 
 * @async
 * @public
 * @since  1.0.0
 */
async function batchDownload(file, downloadOptions) {
  // Resolve the given file path
  file = path.isAbsolute(file) ? file : path.resolve(file);
  downloadOptions = resolveOptions(downloadOptions, _DownloadOptions);
  const { quiet } = downloadOptions;

  // Check whether the file is exist
  try {
    await fs.promises.access(file, fs.constants.R_OK);
  } catch (err) {
    quiet || log.error('I/O error: Unable to access the batch file');
    throw err;
  }

  // Read the contents of the file
  const contents = (await fs.promises.readFile(file, 'utf8')).toString();
  if (contents.trim() === '') throw new Error('File is empty, no URLs found');

  // Split the contents into an array of URLs
  const urls = contents.trim().replace(/(\r\n|\r|\n)/g, '{X}').split('{X}');
  quiet || log.info('Validating URLs, please wait...');
  urls.forEach((url) => validateYTURL(url, false));  // ! Keep the verbose parameter set to false
  quiet || process.stdout.write(
    `${log.DONE_PREFIX} \x1b[92m\u2714\x1b[0m All URLs is valid\n`);

  const progressBar = new ProgressBar();  // Initialize progress bar with default options

  // Ensure that the output directory exists
  await createDirIfNotExist(downloadOptions.outDir);

  const gen = downloadAudio(...urls);

  // Initialize arrays to store the success and failed downloads
  const allDownloads = [],
        successDownloads = [],
        failedDownloads = [],
        failedConverts = [];

  // Create a log file for later logging the error during download
  const errLogFile = createLogFile();

  quiet || log.info(`Starting batch download from file \x1b[93m${
    path.basename(file)}\x1b[0m ...`);

  for (let next = await gen.next(); !next.done; next = await gen.next()) {
    // Get the video information and download stream
    const { videoData, download } = next.value;
    const outFile = path.join(downloadOptions.outDir, `${videoData.title}.m4a`);
    // Create a write stream for the output file
    const outStream = fs.createWriteStream(outFile);
    allDownloads.push(outFile);

    try {
      await downloadHandler(download, {
        videoData, outStream,
        errLogFile, progressBar
      }, !quiet);
      successDownloads.push(outFile);
    /* eslint-disable-next-line no-unused-vars
       ---
       In this case, we don't need to do anything with the error,
       just continue the downloads and brief the download errors
       to user on the download summary afterwards */
    } catch (_err) {
      failedDownloads.push(outFile);
      // * Do not throw, continue download remaining audios if any
    }
  }

  if (downloadOptions.convertAudio) {
    if (await checkFfmpeg(false)) {
      for (const file of successDownloads) {
        try {
          await convertAudio(file, downloadOptions.converterOptions);
        } catch (err) {
          if (!quiet) {
            log.error(err.message);
            log.warn('Skipping audio conversion for one file');
          }
          failedConverts.push(file);
          // * Keep continue
        }
      }
    } else {
      quiet || log.warn('ffmpeg not found, unable to convert audio to specific format');
    }
  }

  // :: Downloads Summary
  if (!quiet) {
    console.log('\n\x1b[1m[DOWNLOADS SUMMARY]\x1b[0m');
    allDownloads.forEach((title) => {
      const downloaded = successDownloads.includes(title);
      title = path.basename(title);  // Trim the path
      console.log((downloaded ? '\x1b[2m' : '\x1b[1m') +
        `  [${downloaded ? '\u2714' : ' '}] ${(downloaded ? '' : '\x1b[91m') + title}\x1b[0m`);
    });

    process.stdout.write('\n');
    log.done('All done, with '
      + `\x1b[96m${failedDownloads.length}\x1b[0m download errors and `
      + `\x1b[96m${failedConverts.length}\x1b[0m convert errors`);

    const errLog = path.join(LOGDIR, path.basename(errLogFile));
    if ((failedDownloads.length > 0) && fs.existsSync(errLog)) {
      log.error(`Error logs written to: \x1b[93m${errLog}\x1b[0m`);
    }
  }

  return successDownloads;
}

/**
 * Downloads a YouTube video's audio with the given ID and options.
 *
 * It first checks if the `id` parameter is a valid YouTube video ID by calling the {@link module:utils/url-utils~URLUtils.validateId validateId}
 * method. If the `id` is not valid, it throws an {@link InvalidTypeError} with a corresponding error message.
 *
 * If the `id` is valid, it constructs a URL by combining the `id` with the base URL '<https://youtu.be>' (shortened YouTube URL).
 * It then calls the {@link module:ytmp3~singleDownload singleDownload} function with the constructed URL and the `downloadOptions` parameter,
 * and returns the result of that function call.
 *
 * @param {!string} id - A valid YouTube video ID.
 * @param {?(DownloadOptions | object)} [downloadOptions]
 *        Options to configure the download process. If not specified, it will automatically uses default options.
 *
 * @returns {Promise<string>} A promise that resolves the output file path when the download completes.
 *
 * @throws {InvalidTypeError} If the given video ID is invalid.
 * @throws {TypeError} If the given video ID is not a `string` type.
 * @throws {Error} If there is an error occurs during download process.
 *
 * @example
 * const ytmp3 = require('ytmp3-js');
 * (async () => {
 *   const file = await ytmp3.downloadFromID('abcdef12345', {
 *     cwd: '/Music',
 *     outDir: 'MyMusic',
 *     convertAudio: true,
 *     quiet: false
 *   });
 *   console.log(`Downloaded and converted to: ${file}`);
 * })();
 *
 * @async
 * @public
 * @since   1.2.0
 * @see     {@link module:ytmp3~singleDownload singleDownload}
 */
async function downloadFromID(id, downloadOptions) {
  if (!URLUtils.validateId(id)) {
    throw new InvalidTypeError(`Invalid given YouTube video ID: ${id}`);
  }

  // Construct the YouTube URL from the given video ID
  const url = new URL(id, 'https://youtu.be');  // Will be "https://youtu.be/${id}"
  return singleDownload(url, downloadOptions);
}

async function ytmp3(input, options) {
  return await download(input, options);
}


Object.assign(ytmp3, {
  version,
  // eslint-disable-next-line camelcase
  version_info,
  downloadAudio,
  downloadHandler,
  defaultHandler,
  getVideosInfo,
  getInfo,
  download,
  singleDownload,
  batchDownload,
  downloadFromID
});

module.exports = ytmp3;
