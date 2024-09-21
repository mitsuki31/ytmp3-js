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
 * @version   1.1.0
 * @requires  audioconv
 * @requires  utils
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     1.0.0
 */

'use strict';

const fs = require('fs'),           // File system module
      os = require('os'),           // OS module
      path = require('path'),       // Path module
      ytdl = require('@distube/ytdl-core');  // Youtube Downloader module

const {
  // eslint-disable-next-line no-unused-vars
  Readable  // only for type declaration
} = require('stream');

const {
  LOGDIR,
  logger: log,
  ProgressBar,
  URLUtils,
  createDirIfNotExist,
  createDirIfNotExistSync,
  createLogFile
} = require('./utils');
const {
  checkFfmpeg,
  convertAudio,
  defaultOptions: defaultAudioConvOptions
} = require('./audioconv');

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
 * The download result object returned by the {@link downloadAudio} function.
 *
 * @typedef  {Object}         DownloadResult
 * @property {ytdl.videoInfo} videoInfo - The raw video information object.
 * @property {VideoData}      videoData - The processed video data object
 *                                        containing sanitized and formatted information.
 * @property {Readable}       download - The download stream for the audio.
 *
 * @private
 * @since    1.0.0
 */

/**
 * An object to configure the download process on {@link module:ytmp3~singleDownload `singleDownload`}
 * and {@link module:ytmp3~batchDownload `batchDownload`} functions.
 *
 * @typedef {Object} DownloadOptions
 * @property {string} [cwd='.'] - The current working directory. If not specified, defaults
 *                                to the current directory.
 * @property {string} [outDir='.'] - The output directory where downloaded files will be saved.
 *                                   If not specified, defaults to the current directory.
 * @property {boolean} [convertAudio=true] - Whether to convert the downloaded audio to a specified
 *                                           format. Defaults to `true`.
 * @property {ConvertAudioOptions} [converterOptions=audiconv.defaultOptions]
 *           Options for the audio converter. If not specified, defaults to {@link module:audioconv~defaultOptions `defaultOptions`}.
 * @property {boolean} [quiet=false] - Whether to suppress console output. Defaults to `false`.
 *
 * @global
 * @since   1.0.0
 */


// region Constants

/**
 * The library name.
 * @constant
 * @default
 * @public
 */
const NAME = 'ytmp3';

/**
 * The library version.
 * @constant
 * @public
 */
const VERSION = require('../package.json').version;

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
const VERSION_INFO = (() => {
  const [ major, minor, patch, build ] = VERSION.split(/[.-]/g);
  return Object.freeze({
    major: Number.parseInt(major),
    minor: Number.parseInt(minor),
    patch: Number.parseInt(patch),
    build: !build ? 'stable' : build });
})();
delete VERSION_INFO.prototype;

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
  if (!url || !(typeof url === 'string' || url instanceof URL)) {
    throw new TypeError(`Invalid type of URL: ${typeof url}`);
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
      (downloadOptions.convertAudio === null
        || typeof downloadOptions.convertAudio === 'undefined')
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
      (downloadOptions.quiet === null || typeof downloadOptions.quiet === 'undefined')
        ? false  // Fallback value
        : (downloadOptions.quiet && typeof downloadOptions.quiet !== 'boolean')
          && throwErr('quiet', getTypeOf(downloadOptions.quiet), 'boolean')
          || downloadOptions.quiet
    )
  };
}


// region Core Functions


/**
 * Retrieves information for multiple YouTube videos sequentially.
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
 * @since  0.2.0
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
 * @yields {Promise<DownloadResult>} A promise that resolves to an object containing
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
 * @since  1.0.0
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
 * Downloads audio from a single YouTube URL and saves it to the output directory.
 *
 * @param   {!(string | URL)}  inputUrl - The URL of the YouTube video to download audio from.
 * @param   {?(DownloadOptions | Object | undefined)} [downloadOptions]
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
 * @since   1.0.0
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
 * This function is similar to {@link module:ytmp3~singleDownload `singleDownload`} but accepts
 * a file containing a list of YouTube URLs as input. If the given file is empty or does not exist,
 * an error will be thrown.
 *
 * As of version 1.0.0, this function has been enhanced and made more robust, aiming at the download process.
 * Previously, it only downloaded the first 15 URLs from the given file. Now, it downloads all of them sequentially.
 * The function can now handle an unlimited number of URLs, downloading them one by one (also known as,
 * sequential download) instead of all at once. Additionally, the download progress bar has been reworked
 * to display more precise and colorful information in the terminal, providing users with better insights
 * into the download process, and also more better and improved errors handling.
 *
 * @param   {!string} inputFile - The path to the file containing YouTube URLs.
 * @param   {?(DownloadOptions | Object | undefined)} [downloadOptions]
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
async function batchDownload(inputFile, downloadOptions) {
  // Resolve the given file path
  inputFile = path.resolve(inputFile);
  downloadOptions = resolveDlOptions({ downloadOptions });
  const { quiet } = downloadOptions;

  // Check whether the file is exist
  if (!fs.existsSync(inputFile)) {
    throw new Error(`File not exists: ${inputFile}`);
  }

  // Read the contents of the file
  const contents = (await fs.promises.readFile(inputFile, 'utf8')).toString();
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
    path.basename(inputFile)}\x1b[0m ...`);

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

module.exports = Object.freeze({
  NAME,
  VERSION,
  VERSION_INFO,
  validateYTURL,
  resolveDlOptions,
  downloadAudio,
  downloadHandler,
  getVideosInfo,
  writeErrorLog,
  singleDownload,
  batchDownload
});
