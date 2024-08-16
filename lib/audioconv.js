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
const { promisify } = require('node:util');
const ffmpeg = require('fluent-ffmpeg');

const {
  logger: log,
  LOGDIR,
  createDirIfNotExistSync,
  createLogFile,
  dropNullAndUndefined,
  isNullOrUndefined
} = require('./utils');

// Promisify the `exec` function
const exec = promisify(childProcess.exec);


/**
 * Options for configuring the audio conversion.
 *
 * @typedef  {Object} ConvertAudioOptions
 * @property {string[]} [inputOptions] - The input options for the conversion.
 * @property {string[]} [outputOptions] - The output options for the conversion.
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
          resolvedOptions.push(`${option} ${optionsList[valueIndex]}`);
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
 * @private
 * @param  {ConvertAudioOptions} options - The unresolved audio converter options.
 * @return {ResolvedConvertAudioOptions} The resolved options.
 * @since  1.0.0
 */
function resolveOptions(options, useDefault=true) {
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
  if (process.env.FFMPEG_PATH) {
    if ((await fs.promises.stat(process.env.FFMPEG_PATH)).isDirectory()) {
      const msg = '[EISDIR] Please set the FFMPEG_PATH environment variable '
        + 'to the path of the `ffmpeg` binary';
      verbose && log.warn(msg);
      throw new Error(msg);
    }

    verbose && log.debug('`ffmpeg` installed on system');
    return true;
  }

  // This try-catch block to handle error,
  // in case the `ffmpeg` binary is not installed on system
  try {
    const { status } = await exec('ffmpeg -version');
    if (status !== 0) {
      verbose && log.debug('`ffmpeg` installed on system');
      return true;
    }

    verbose && log.error('`ffmpeg` not installed on system');
    return false;
  /* eslint-disable-next-line no-unused-vars
     ---
     Only need to ensure that the `spawn` call is correctly executed
     to check FFmpeg; if error occurred, that means the `ffmpeg` command
     are not recognized */
  } catch (_err) {
    verbose && log.error('`ffmpeg` not installed on system');
    return false;
  }
}

function writeErrorLog(logFile, data, error) {
  // Throw the error if the log file name is invalid
  if (isNullOrUndefined(logFile) || typeof logFile !== 'string') {
    throw error;
  }

  logFile = path.join(LOGDIR, path.basename(logFile));
  createDirIfNotExistSync(LOGDIR);

  const logStream = fs.createWriteStream(logFile);

  logStream.write(`[ERROR]<ACONV> ${error?.message || 'Unknown error'}${EOL}`);
  logStream.write(`   Input Audio: ${data?.inputAudio || 'Unknown'}${EOL}`);
  logStream.write(`   Output Audio: ${data?.outputAudio || 'Unknown'}${EOL}`);
  logStream.write(`   File Size: ${data?.inputSize / (1024 * 1024) || '0.0'} MiB${EOL}`);
  logStream.write(`---------------------------------------------${EOL}`);
  logStream.end(EOL);
}


// region Audio Conversion


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
      ffmpegChain
        .audioBitrate(options.bitrate)
        .audioCodec(options.codec)
        .audioChannels(options.channels)
        .audioFrequency(options.frequency)
        .outputFormat(options.format);
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
        if (!quiet) {
          process.stdout.write('\n');
          writeErrorLog(createLogFile('audioConvError'), {
            inputFile: inFile,
            outputFile: outFile,
            inputSize: fs.statSync(inFile).size
          }, err);
          log.error('Failed to convert the audio file');
          console.error('Caused by:', err.message);
        }
        reject(err);
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
