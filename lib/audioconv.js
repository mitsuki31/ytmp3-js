/**
 * `audioconv` is an abbreviation for Audio Converter, this module
 * provides a function to convert audios to any supported format utilizing the
 * `fluent-ffmpeg` module and `ffmpeg` library on the system.
 *
 * To convert the audio file, this module needs `ffmpeg` to be installed.
 * You can download it from [FFmpeg official site](https://ffmpeg.org/).
 * Or if you want to use CLI:
 *
 * #### Using `apt` (for Linux)
 * ```bash
 * $ sudo apt install ffmpeg
 * ```
 *
 * #### Using Chocolatey (for Windows)
 * <small>_*Make sure to **Run as Administrator**_</small>
 * ```pwsh
 * PS > choco install ffmpeg-full -y
 * ```
 *
 * @module    audioconv
 * @requires  utils
 * @author    Ryuu Mitsuki (https://github.com/mitsuki31)
 * @license   MIT
 * @since     0.2.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { promisify } = require('node:util');
const childProcess = require('node:child_process');
const ffmpeg = require('fluent-ffmpeg');

// Promisify the `exec` function
const exec = promisify(childProcess.exec);

const { logger: log } = require('./utils');

/**
 * Options for configuring the audio conversion.
 *
 * @typedef  {Object} ConvertAudioOptions
 * @property {string} [format='mp3'] - The desired output format (e.g., `'mp3'`, `'aac'`).
 * @property {string | number} [bitrate=128] - The audio bitrate (e.g., `'128k'`),
 *                                               it may be a number or a string with an optional `k` suffix.
 * @property {number} [frequency=44100] - The audio sampling frequency in Hz.
 * @property {string} [codec='libmp3lame'] - The audio codec to use (e.g., `'libmp3lame'`).
 * @property {number} [channels=2] - The number of audio channels (`2` for stereo).
 * @property {boolean} [deleteOld=false] - Whether to delete the original file after conversion.
 * @property {boolean} [quiet=false] - Whether to suppress the conversion progress and error message or not.
 *
 * @since    1.0.0
 * @see      {@link module:audioconv~defaultOptions defaultOptions}
 */

/**
 * The resolved {@link module:audioconv~ConvertAudioOptions ConvertAudioOptions} options.
 *
 * @typedef  {ConvertAudioOptions} ResolvedConvertAudioOptions
 * @property {string} format - The desired output format (e.g., `'mp3'`, `'aac'`).
 * @property {string | number} bitrate - The audio bitrate (e.g., `'128k'`),
 *                                               it may be a number or a string with an optional `k` suffix.
 * @property {number} frequency - The audio sampling frequency in Hz.
 * @property {string} codec - The audio codec to use (e.g., `'libmp3lame'`).
 * @property {number} channels - The number of audio channels (`2` for stereo).
 * @property {boolean} deleteOld - Whether to delete the original file after conversion.
 * @property {boolean} quiet - Whether to suppress the conversion progress and error message or not.
 *
 * @since    1.0.0
 * @see      {@link module:audioconv~defaultOptions defaultOptions}
 */


/**
 * Default options of audio converter options.
 *
 * Any option that are not specified on `options` argument in `convertAudio` function
 * will fallback to this options. This default options will convert the audio
 * to the MP3 format with bitrate of 128 kbps, frequency of 44100 Hz (Hertz),
 * stereo channel and use the default MP3 codec.
 *
 * If you want to delete the old audio file after conversion, set the
 * `deleteOld` option to `true`.
 *
 * @constant
 * @type    {ResolvedConvertAudioOptions}
 * @since   0.2.0
 */
const defaultOptions = Object.freeze({
  format: 'mp3',
  bitrate: 128,  // optional `k` suffix
  frequency: 44100,
  codec: 'libmp3lame',
  channels: 2,
  deleteOld: false,
  quiet: false
});

/**
 * Resolves the given {@link ConvertAudioOptions} options.
 *
 * @private
 * @param  {ConvertAudioOptions} options - The unresolved audio converter options.
 * @return {ResolvedConvertAudioOptions} The resolved options.
 * @since  1.0.0
 */
function resolveOptions(options) {
  return {
    format: (typeof options?.format === 'string')
      ? options.format
      : defaultOptions.format,
    bitrate: ['string', 'number'].includes(typeof options?.bitrate)
      ? options.bitrate
      : defaultOptions.bitrate,
    frequency: (typeof options?.frequency === 'number')
      ? options.frequency
      : defaultOptions.frequency,
    codec: (typeof options?.codec === 'string')
      ? options.codec
      : defaultOptions.codec,
    channels: (typeof options?.channels === 'number')
      ? options.channels
      : defaultOptions.channels,
    deleteOld: (typeof options?.deleteOld === 'boolean')
      ? options.deleteOld
      : defaultOptions.deleteOld,
    quiet: (typeof options?.quiet === 'boolean')
      ? options.quiet
      : defaultOptions.quiet
  };
}


/**
 * Checks whether the `ffmpeg` binary is installed on system or not.
 *
 * First, it checks if the `FFMPEG_PATH` environment variable is set. If it is set, it returns `true`.
 * Otherwise, if not set, it checks if the `ffmpeg` binary is installed on system by directly executing it.
 *
 * @param {boolean} verbose - Whether to log verbose messages or not.
 * @returns {Promise<boolean>} `true` if the `ffmpeg` binary installed on system; otherwise, `false`.
 *
 * @async
 * @public
 * @since  1.0.0
 */
async function checkFfmpeg(verbose=false) {
  verbose && log.debug('Checking `ffmpeg` binary...');
  if (process.env.FFMPEG_PATH) {
    verbose && log.debug('`ffmpeg` installed on system');
    return true;
  }

  // This try-catch block to handle error,
  // in case the `ffmpeg` binary is not installed on system
  try {
    const { stdout, stderr } = await exec('ffmpeg -version');
    if (!stderr && stdout) {
      verbose && log.debug('`ffmpeg` installed on system');
      return true;
    }

    verbose && log.error('`ffmpeg` not installed on system');
    return false;
  } catch (err) {
    verbose && log.error('`ffmpeg` not installed on system');
    return false;
  }
}


function createConversionProgress(info, extnames) {
  const percentage = Math.max(0, Math.round(info.percent || 0));
  const currentKbps = Math.max(0, info.currentKbps || 0);
  const targetSize = (Math.max(0, info.targetSize || 0) / 1024).toFixed(2);
  return `
    \x1b[K${(percentage < 100 ? '\x1b[1;93m[...]\x1b[0m' : log.DONE_PREFIX)
} (${extnames[0].toUpperCase()} >> ${extnames[1].toUpperCase()}) | \x1b[95m${
  currentKbps} kbps // ${targetSize} MB\x1b[0m ${
  percentage < 100 ? '\x1b[93m' : '\x1b[92m'}[${percentage}%]\x1b[0m
  `.trim() + '\r';
}

/**
 * Converts an audio file to a specified format using the given options.
 *
 * Before performing audio conversion, it first checks the `ffmpeg` binary by
 * searching on the `FFMPEG_PATH` environment variable, if set. Otherwise, it
 * force check by calling the `ffmpeg` command itself on child process.
 *
 * If the `ffmpeg` is not installed on the system, this function will aborts
 * immediately and rejects with an error.
 *
 * @param {string} inFile - The input file path of the audio file to be converted.
 * @param {ConvertAudioOptions} [options=defaultOptions] - Options object for configuring
 *                                                         the conversion process.
 *
 * @throws {Error} If the input audio file is not exist or if there is an error
 *                 occurred during audio conversion.
 *
 * @example
 * convertAudio('path/to/audio.wav', { format: 'mp3', bitrate: '192k' })
 *   .then(() => console.log('Conversion complete'))
 *   .catch(err => console.error('Conversion failed:', err));
 *
 * @async
 * @public
 * @since   0.2.0
 * @see     {@link module:audioconv~defaultOptions defaultOptions}
 * @see     {@link module:audioconv~checkFfmpeg checkFfmpeg}
 */
async function convertAudio(inFile, options = defaultOptions) {
  inFile = path.resolve(inFile);
  /**
   * @ignore
   * @type {ResolvedConvertAudioOptions}
   */
  options = resolveOptions(options);
  const { quiet } = options;  // Extract the 'quiet' field

  // Check whether the given audio file is exist
  if (!fs.existsSync(inFile)) {
    throw new Error('File not exists: ' + inFile);
  }

  // Regular expressions for audio codecs
  const audioCodecRegex = /(mp3|aac|wav|flac|ogg|wma|opus|amr|m4a)/i,      // All known extension names of audio file
        noExtRegex = new RegExp(`(.+)(?:\\.${audioCodecRegex.source})$`);  // Get the file name without its extension

  // Create the output file name and change the file extension
  const outFile = path.join(
    path.dirname(inFile),
    `${noExtRegex.exec(path.basename(inFile))[1]}.${options.format}`
  );

  // Store the file names only without their path directories
  const ioBaseFile = [
    path.basename(inFile),
    path.basename(outFile)
  ];
  const extnames = [
    path.extname(inFile).replace('.', ''),
    path.extname(outFile).replace('.', '')
  ];

  quiet || log.info(`Processing audio for \x1b[93m${
    noExtRegex.exec(ioBaseFile[0])[1]}\x1b[0m ...`);

  // Check whether the `ffmpeg` binary is installed
  if (!(await checkFfmpeg())) {
    if (!quiet) {
      log.error('Cannot find `ffmpeg` on your system');
      log.error('Audio conversion aborted');
    }
    throw new Error('Cannot find `ffmpeg` binary on your system');
  }

  await new Promise((resolve, reject) => {
    // Perform audio conversion using ffmpeg
    ffmpeg(inFile)  // Input
      // Options
      .audioBitrate(options.bitrate)
      .audioCodec(options.codec)
      .audioChannels(options.channels)
      .audioFrequency(options.frequency)
      .outputFormat(options.format)

      // Handlers
      .on('error', (err) => {
        if (!quiet) {
          process.stdout.write('\n');
          log.error('Failed to convert the audio file');
          console.error('Caused by:', err.message);
        }
        reject(err);
      })
      .on('progress', (info) => {
        // Write the progress information to the console
        quiet || process.stdout.write(createConversionProgress(info, extnames));
      })
      .on('end', async () => {
        quiet || process.stdout.write('\n');

        // Remove the old audio file if `deleteOld` option is true
        if (options.deleteOld) {
          await fs.promises.rm(inFile);
        }
        resolve();
      })
      .save(outFile);  // Output
  });
}


module.exports = Object.freeze({
  defaultOptions,
  checkFfmpeg,
  convertAudio
});
