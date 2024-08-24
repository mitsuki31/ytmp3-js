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
const childProcess = require('node:child_process');
const { EOL } = require('node:os');
const ffmpeg = require('fluent-ffmpeg');

const {
  logger: log,
  LOGDIR,
  createDirIfNotExistSync,
  createLogFile,
  dropNullAndUndefined,
  isNullOrUndefined,
  isObject
} = require('./utils');

/**
 * Options for configuring the audio conversion.
 *
 * @typedef  {Object} ConvertAudioOptions
 * @property {string[]} [inputOptions=[]] - The input options for the conversion.
 * @property {string[]} [outputOptions=[]] - The output options for the conversion.
 * @property {string} [format='mp3'] - The desired output format (e.g., `'mp3'`, `'aac'`).
 * @property {string | number} [bitrate=128] - The audio bitrate (e.g., `'128k'`),
 *                                               it may be a number or a string with an optional `k` suffix.
 * @property {number} [frequency=44100] - The audio sampling frequency in Hz.
 * @property {string} [codec='libmp3lame'] - The audio codec to use (e.g., `'libmp3lame'`).
 * @property {number} [channels=2] - The number of audio channels (`2` for stereo).
 * @property {boolean} [deleteOld=false] - Whether to delete the original file after conversion.
 * @property {boolean} [quiet=false] - Whether to suppress the conversion progress and error message or not.
 *
 * @global
 * @since    1.0.0
 * @see      {@link module:audioconv~defaultOptions defaultOptions}
 */

/**
 * The resolved {@link module:audioconv~ConvertAudioOptions ConvertAudioOptions} options.
 *
 * @typedef  {Object} ResolvedConvertAudioOptions
 * @property {string[]} inputOptions - The input options for the conversion.
 * @property {string[]} outputOptions - The output options for the conversion.
 * @property {string} format - The desired output format (e.g., `'mp3'`, `'aac'`).
 * @property {string | number} bitrate - The audio bitrate (e.g., `'128k'`),
 *                                               it may be a number or a string with an optional `k` suffix.
 * @property {number} frequency - The audio sampling frequency in Hz.
 * @property {string} codec - The audio codec to use (e.g., `'libmp3lame'`).
 * @property {number} channels - The number of audio channels (`2` for stereo).
 * @property {boolean} deleteOld - Whether to delete the original file after conversion.
 * @property {boolean} quiet - Whether to suppress the conversion progress and error message or not.
 *
 * @package
 * @since    1.0.0
 * @see      {@link module:audioconv~defaultOptions defaultOptions}
 */

/**
 * An object representing the information data when FFmpeg emits the `'progress'` event.
 *
 * @typedef  {Object} FFmpegInfo
 * @property {number} frames - Total processed frame count.
 * @property {number} currentFps - Framerate at which FFmpeg is currently processing.
 * @property {number} currentKbps - Throughput at which FFmpeg is currently processing.
 * @property {number} targetSize - Current size of the target file in kilobytes.
 * @property {number} timemark - The timestamp of the current frame in seconds.
 * @property {number} percent - An estimation of the progress percentage, may be (very) inaccurate.
 *
 * @package
 * @since  1.1.0
 * @see    ['progress' event]{@linkplain https://github.com/fluent-ffmpeg/node-fluent-ffmpeg#progress-transcoding-progress-information}
 */

/**
 * Default options of audio converter options.
 *
 * This default options will convert the audio to the MP3 format with bitrate of 128 kbps,
 * frequency of 44100 Hz (Hertz), stereo channel and use the default MP3 codec.
 *
 * If you want to delete the old audio file after conversion, set the
 * `deleteOld` option to `true`.
 *
 * @public
 * @readonly
 * @type    {Readonly<module:audioconv~ResolvedConvertAudioOptions>}
 * @since   0.2.0
 */
const defaultOptions = Object.freeze({
  inputOptions: [],
  outputOptions: [],
  format: 'mp3',
  bitrate: 128,  // optional `k` suffix
  frequency: 44100,
  codec: 'libmp3lame',
  channels: 2,
  deleteOld: false,
  quiet: false
});

// region Utilities

/**
 * Splits and resolves FFmpeg options from a string or array format into an array of individual options.
 * 
 * This function handles both single string input, where options are space-separated, and array input. 
 * It correctly pairs options with their respective values and avoids accidental concatenation with subsequent options.
 * 
 * @example
 * const optionsStr = '-f -vcodec libx264 -preset slow';
 * const result1 = splitOptions(optionsStr);
 * // Output: ['-f', '-vcodec libx264', '-preset slow']
 *
 * @param {string | string[]} options - The options to split, either as a string or an array.
 * @returns {string[]} The resolved options as an array of individual options.
 *
 * @package
 * @since 1.0.0
 */
function splitOptions(options) {
  if (typeof options === 'string') {
    const optionsList = options.trim().split(' ');
    const resolvedOptions = [];

    // Iterate over the options and resolve the option
    optionsList.forEach((option, index) => {
      let valueIndex = -1;  // To indicate if the option has a value, -1 means no value

      // Only resolve the option that starts with a hyphen ('-')
      if (option.startsWith('-')) {
        valueIndex = index + 1;
        if (valueIndex < optionsList.length) {
          // Check if the next argument is not an option that starts with hyphen
          if (!optionsList[valueIndex].startsWith('-')) {
            resolvedOptions.push(`${option} ${optionsList[valueIndex]}`);
          // Otherwise, only push the option without the next argument as value
          } else {
            resolvedOptions.push(option);
          }
        } else {
          resolvedOptions.push(option);
        }
      } else {
        // If the option doesn't start with a hyphen, it's a value
        // of the previous option and won't add it to the list
        // and also this option may an invalid or unknown option for FFmpeg
        if (valueIndex > -1) resolvedOptions.push(option);
      }
    });

    // Drop null and undefined values and convert to an array
    return Object.values(dropNullAndUndefined(
      resolvedOptions.map(option => option.trim())
    ));
  } else if (Array.isArray(options)) {
    return options;
  }

  return [];
}

/**
 * Resolves the given {@link ConvertAudioOptions} options.
 *
 * @package
 * @param  {ConvertAudioOptions} options - The unresolved audio converter options.
 * @return {module:audioconv~ResolvedConvertAudioOptions} The resolved options.
 * @since  1.0.0
 */
function resolveOptions(options, useDefault=false) {
  if (!isObject(options)) return defaultOptions;

  return {
    inputOptions: (
      Array.isArray(options?.inputOptions)
        ? options.inputOptions
        : (typeof options?.inputOptions === 'string')
          ? splitOptions(options.inputOptions)
          : (useDefault ? defaultOptions.inputOptions : undefined)
    ),
    outputOptions: (
      Array.isArray(options?.outputOptions)
        ? options.outputOptions
        : (typeof options?.outputOptions === 'string')
          ? splitOptions(options.outputOptions)
          : (useDefault ? defaultOptions.outputOptions : undefined)
    ),
    format: (typeof options?.format === 'string')
      ? options.format
      : (useDefault ? defaultOptions.format : undefined),
    bitrate: ['string', 'number'].includes(typeof options?.bitrate)
      ? options.bitrate
      : (useDefault ? defaultOptions.bitrate : undefined),
    frequency: (typeof options?.frequency === 'number')
      ? options.frequency
      : (useDefault ? defaultOptions.frequency : undefined),
    codec: (typeof options?.codec === 'string')
      ? options.codec
      : (useDefault ? defaultOptions.codec : undefined),
    channels: (typeof options?.channels === 'number')
      ? options.channels
      : (useDefault ? defaultOptions.channels : undefined),
    deleteOld: (typeof options?.deleteOld === 'boolean')
      ? options.deleteOld
      : (useDefault ? defaultOptions.deleteOld : undefined),
    quiet: (typeof options?.quiet === 'boolean')
      ? options.quiet
      : (useDefault ? defaultOptions.quiet : undefined)
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
  if (!isNullOrUndefined(process.env.FFMPEG_PATH) && process.env.FFMPEG_PATH !== '') {
    if ((await fs.promises.stat(process.env.FFMPEG_PATH)).isDirectory()) {
      const msg = '[EISDIR] Please set the FFMPEG_PATH environment variable '
        + 'to the path of the `ffmpeg` binary';
      verbose && log.warn(msg);
      throw new Error(msg);
    }

    verbose && log.debug('`ffmpeg` installed on system');
    return true;
  }

  const { status } = childProcess.spawnSync('ffmpeg', ['-version'], {
    shell: true,       // For Windows, would cause error if this set to false
    windowsHide: true
  });
  if (status === 0) {
    verbose && log.debug('`ffmpeg` installed on system');
    return true;
  }

  verbose && log.error('`ffmpeg` not installed on system');
  return false;
}

/**
 * Writes error details and associated video information to a log file.
 *
 * The error message is written to the log file in the following format:
 *
 * ```txt
 * [ERROR]<ACONV> <error message>
 *   Input Audio: <input audio name>
 *   Output Audio: <output audio name>
 *   File Size: <input audio size> MiB
 * ---------------------------------------------
 * ```
 *
 * Generated log file will be saved in {@link module:utils~LOGDIR `LOGDIR`} directory
 * with file name typically prefixed with `'audioConvError'`.
 *
 * @param {string} logFile - The name of the log file where the error details should be written.
 * @param {Object} data - An object containing information about the audio associated with the error.
 * @param {Error} [error] - The error object, optional. If not provided,
 *                          an error message will be `'Unknown error'`.
 * @returns {Promise<void>}
 *
 * @async
 * @package
 * @since  1.0.0
 */
async function writeErrorLog(logFile, data, error) {
  // Return immediately if given log file is not a string type
  if (isNullOrUndefined(logFile) || typeof logFile !== 'string') return;

  logFile = path.join(LOGDIR, path.basename(logFile));
  createDirIfNotExistSync(LOGDIR);

  return new Promise((resolve, reject) => {
    const logStream = fs.createWriteStream(logFile, { flags: 'a+', flush: true });

    logStream.write(`[ERROR]<ACONV> ${error?.message || 'Unknown error'}${EOL}`);
    logStream.write(`   Input Audio: ${data?.inputAudio || 'Unknown'}${EOL}`);
    logStream.write(`   Output Audio: ${data?.outputAudio || 'Unknown'}${EOL}`);
    logStream.write(`   File Size: ${data?.inputSize / (1024 * 1024) || '0.0'} MiB${EOL}`);
    logStream.write(`---------------------------------------------${EOL}`);
    logStream.end(EOL);

    logStream.on('finish', () => resolve());
    logStream.on('error', (err) => {
      if (!logStream.destroyed) logStream.destroy();
      reject(err);
    });
  });
}


// region Audio Conversion

/**
 * Creates a string representing the progress bar for audio conversion progress.
 *
 * @param {FFmpegInfo} info - The progress data from FFmpeg.
 * @param {string[]} extnames - A list of extension names of both input and output files.
 * @returns {string} A formatted string representing the progress bar with percentage.
 *
 * @package
 * @since  1.0.0
 */
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
  options = dropNullAndUndefined(options);  // Drop all nullable properties

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

  // Create the output file name and change the file extension
  let outFile = path.join(
    path.dirname(inFile),
    `${path.basename(inFile).replace(/\.[^/.]+$/, '')}.${(options.format
      || (() => {
        let index = 0;
        if (Array.isArray(options.outputOptions) && options.outputOptions.length > 0) {
          options.outputOptions.forEach((opt, idx) => {
            if (opt.match(/^-(acodec|c:a)/)) index = idx;
          });
          return options.outputOptions[index].split(' ')[1];
        }
        return null;
      })()
      || path.extname(inFile).replace(/^\./, ''))
    }`
  );

  // Store the file names only without their path directories
  const ioBaseFile = [
    path.basename(inFile).replace(/\.[^/.]+$/, ''),
    path.basename(outFile).replace(/\.[^/.]+$/, '')
  ];
  const extnames = [
    path.extname(inFile).replace('.', ''),
    path.extname(outFile).replace('.', '')
  ];

  // Logic to prevent crash due to write the same file in-place
  if (inFile === outFile) {
    ioBaseFile[1] = ioBaseFile[1] + ' (copy)';
    outFile = path.join(path.dirname(outFile), `${ioBaseFile[1]}.${extnames[1]}`);
  }

  quiet || log.info(`Processing audio for \x1b[93m${ioBaseFile[0]}\x1b[0m ...`);

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
    const ffmpegChain = ffmpeg()
      .addInput(inFile)  // IN
      .output(outFile);  // OUT

    // Only add non-custom options (e.g., bitrate, codec) if the `inputOptions`
    // and `outputOptions` are not set or they are an empty array, this make the
    // custom options are more prioritized
    if (
      (
        isNullOrUndefined(options.inputOptions)
          || (Array.isArray(options.inputOptions) && options.inputOptions.length === 0)
      ) && (
        isNullOrUndefined(options.outputOptions)
          || (Array.isArray(options.outputOptions) && options.outputOptions.length === 0)
      )
    ) {
      // Add each option only if present and specified
      // By using this logic, now user can convert an audio file with only specifying
      // the output audio format
      if (options.bitrate) ffmpegChain.audioBitrate(options.bitrate);
      if (options.codec) ffmpegChain.audioCodec(options.codec);
      if (options.channels) ffmpegChain.audioChannels(options.channels);
      if (options.frequency) ffmpegChain.audioFrequency(options.frequency);

      // Mandatory for output format
      // Note: Specifying the same output format as input may copy the input file
      //       with the same codec and format
      ffmpegChain.outputFormat(options.format);
    } else {
      if (Array.isArray(options.inputOptions)) {
        ffmpegChain.inputOptions(options.inputOptions);
      }

      if (Array.isArray(options.outputOptions)) {
        ffmpegChain.outputOptions(options.outputOptions);
      }
    }

    // Handlers
    ffmpegChain
      .on('error', (err) => {
        quiet || process.stdout.write('\n');
        writeErrorLog(createLogFile('audioConvError'), {
          inputFile: inFile,
          outputFile: outFile,
          inputSize: fs.statSync(inFile).size
        }, err).then(() => {
          if (!quiet) {
            log.error('Failed to convert the audio file');
            console.error('Caused by:', err.message);
          }
          reject(err);
        }).catch((errLog) => reject(new Error(errLog.message, { cause: err })));
      })
      .on('progress', (info) => {
        // Write the progress information to the console
        quiet || process.stdout.write(createConversionProgress(info, extnames));
      })
      .on('end', () => {
        quiet || process.stdout.write('\n');

        // Remove the old audio file if `deleteOld` option is true
        if (options.deleteOld) {
          fs.rmSync(inFile);
        }
        resolve();
      });

    ffmpegChain.run();
  });
}


module.exports = Object.freeze({
  defaultOptions,
  resolveOptions,
  checkFfmpeg,
  convertAudio
});
