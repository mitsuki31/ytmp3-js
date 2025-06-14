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
 * @requires  {@link https://npmjs.com/package/fluent-ffmpeg npm:fluent-ffmpeg}
 * @requires  {@link https://nodejs.org/api/fs.html node:fs}
 * @requires  {@link https://nodejs.org/api/os.html node:os}
 * @requires  {@link https://nodejs.org/api/path.html node:path}
 * @requires  {@link https://nodejs.org/api/util.html node:util}
 * @requires  {@link https://nodejs.org/api/child_process.html node:child_process}
 * @author    Ryuu Mitsuki <{@link https://github.com/mitsuki31}>
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
  Logger,
  LOGDIR,
  colors: $c,
  _AudioConverterOptions,
  _FFmpegCommandOptions,
  TypeUtils,
  createDirIfNotExistSync,
  dropNullAndUndefined,
  isNullOrUndefined,
  isPlainObject
} = require('./utils');
const { getGlob } = require('./env');
const { InvalidTypeError } = require('./error');

/**
 * Options for configuring the audio conversion.
 *
 * @typedef  {Object} AudioConverterOptions
 * @property {string[]} [inputOptions=[]] - The input options for the conversion.
 * @property {string[]} [outputOptions=[]] - The output options for the conversion.
 * @property {string} [format='mp3'] - The desired output format (e.g., `'mp3'`).
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
 * @see      {@link module:audioconv~defaultOptions audioconv.defaultOptions}
 */

/**
 * The resolved {@link module:audioconv~AudioConverterOptions AudioConverterOptions} options.
 *
 * @typedef  {Object} ResolvedAudioConverterOptions
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
 * @see      {@link module:audioconv~defaultOptions audioconv.defaultOptions}
 */

/**
 * An object representing the result of the audio conversion process.
 *
 * @typedef  {Object} ConversionResult
 * @property {object} input - The input audio file information.
 * @property {string} input.path - The absolute path of the input audio file.
 * @property {string} input.name - The base name of the input audio file.
 * @property {ffmpeg.FfprobeData} input.metadata - The metadata information of the input audio file.
 * @property {boolean} input.deleted - Set to `true` if the `options.deleteOld` option is enabled and the input audio file
 *                                     has been deleted, otherwise `false`.
 * @property {object} output - The output audio file information.
 * @property {string} output.path - The absolute path of the output audio file.
 * @property {string} output.name - The base name of the output audio file.
 * @property {ffmpeg.FfprobeData} output.metadata - The metadata information of the output audio file.
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

const log = getGlob('logger', Logger);
const HAS_FFMPEG = getGlob('hasFfmpeg', false);
const FFMPEG_PATH = getGlob('ffmpegPath');
const FFPROBE_PATH = getGlob('ffprobePath');
const FFMPEG_VERSION = getGlob('ffmpegVersion');

/**
 * Default options of audio converter options.
 *
 * This default options will convert the audio to the MP3 format with bitrate of 128 kbps,
 * frequency of 44100 Hz (Hertz), stereo channel and use the default MP3 codec (`libmp3lame`).
 *
 * If you want to delete the old audio file after conversion, set the
 * `deleteOld` option to `true`.
 *
 * @public
 * @readonly
 * @type    {Readonly<module:audioconv~ResolvedAudioConverterOptions>}
 * @since   0.2.0
 * @deprecated Please use {@link module:utils/options~defaults.AudioConverterOptions `defaults.AudioConverterOptions`} instead.
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
 * Resolves the given {@link AudioConverterOptions} options.
 *
 * @package
 * @param  {AudioConverterOptions} options - The unresolved audio converter options.
 * @return {module:audioconv~ResolvedAudioConverterOptions} The resolved options.
 * @since  1.0.0
 * @deprecated
 */
function resolveOptions(options, useDefault = false) {
  if (!isPlainObject(options)) return defaultOptions;

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
 * Otherwise, if not set, it checks if the `ffmpeg` binary is installed on system by directly executing it
 * (it may definitely set within `PATH` environment variable).
 *
 * @param {boolean} [verbose] - Whether to log verbose messages. Defaults to `false`.
 * @returns {Promise<boolean>} `true` if the `ffmpeg` binary is installed on system, otherwise `false`.
 *
 * @async
 * @public
 * @since  1.0.0
 */
async function checkFfmpeg(verbose = false) {
  if (HAS_FFMPEG) {
    verbose && log.debug(`FFmpeg v${FFMPEG_VERSION} is already installed`);
    return true;
  }

  verbose && log.debug('Checking for FFmpeg executable binary ...');
  if (!isNullOrUndefined(process.env.FFMPEG_PATH) && process.env.FFMPEG_PATH !== '') {
    if ((await fs.promises.stat(process.env.FFMPEG_PATH)).isDirectory()) {
      const msg = '[EISDIR] Please set the FFMPEG_PATH environment variable '
        + 'to the path of the `ffmpeg` binary';
      verbose && log.warn(msg);
      throw new Error(msg);
    }

    verbose && log.debug('FFmpeg is installed on the system');
    return true;
  }

  return await new Promise((resolve) => {
    const childProc = childProcess.exec('ffmpeg -version', (err) => {
      if (err) {
        verbose && log.error('FFmpeg is not installed on the system');
        console.error(`${err.name}: ${err.message}`);
        resolve(false);
      } else {
        verbose && log.debug('FFmpeg is installed on the system');
        resolve(true);
      }
    });
    process.once('SIGINT', () => {
      log.debug('Terminating the child process ...');
      childProc.kill('SIGTERM');  // Terminate the child process
      // Do not exit the process, it handled by the caller
    });
  });
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
 * @deprecated
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
  extnames = extnames.map(ext => ext.toUpperCase());

  // NOTE: Recommended to clear the line before printing this
  return `
    ${((percentage < 100) ? $c.style([0, '^', 'BY'], '[...]') : log.DONE_PREFIX)
} (${extnames[0]} >> ${extnames[1]}) | ${$c.style([0, 'BM'], `${currentKbps} kbps // ${targetSize} MiB`)} ${$c.style([0, ((percentage < 100) ? 'BY' : 'BG')], `[${percentage}%]`)
}
  `.trim() + '\r';
}

/**
 * Retrieves the metadata of an audio file using FFprobe.
 *
 * Needs the FFprobe binary to be installed on the system.
 *
 * @param {string} file - The path to the audio file.
 * @returns {Promise<ffmpeg.FfprobeData>} Fulfilled with the metadata of the audio file.
 *
 * @throws {Error} If FFprobe fails to retrieve the metadata.
 *
 * @private
 * @since   2.0.0
 */
async function getAudioMetadata(file) {
  return await new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, metadata) => {
      if (err) reject(err);
      resolve(metadata);
    });
  });
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
 * @param {string | AudioConverterOptions} outFile - The output file path of the converted audio file.
 * @param {AudioConverterOptions} [options] - Options object for configuring the audio conversion process.
 * @returns {Promise<ConversionResult>} An object containing the input and output audio file information.
 *
 * @throws {InvalidTypeError} If the input or output audio path is invalid type.
 * @throws {Error} If the input audio file is not exist or if there is an error
 *                 occurred during audio conversion.
 *
 * @example
 * convertAudio('path/to/audio.wav', { format: 'mp3', bitrate: '192k' })
 *   .then((result) => console.log('Conversion completed:', result.output.path))
 *   .catch(err => console.error('Conversion failed:', err));
 *
 * @async
 * @public
 * @since   0.2.0
 * @see     {@link module:audioconv~checkFfmpeg checkFfmpeg}
 */
async function convertAudio(inFile, outFile, options) {
  /**
   * Handles the interruption of the audio conversion process.
   * 
   * This function is called when the conversion process is interrupted (e.g., by a `SIGINT` signal).
   * It logs an error message and terminates the ffmpeg process gracefully.
   * Finally, it exits the process with a status code of 130 (`SIGINT`).
   *
   * @private
   */
  function conversionInterruptedHandler() {
    quiet || process.stdout.write('\n');
    quiet || log.error('Program interrupted. Exiting now ...');
    setImmediate(() => {
      if (ffmpegChain) ffmpegChain.kill('SIGTERM');  // Terminate the ffmpeg process, it is better than `SIGKILL`
    });
  }

  function getOutputExtname(options) {
    if (typeof options.format === 'string') return options.format;
    let index = 0;
    if (Array.isArray(options.outputOptions) && options.outputOptions.length > 0) {
      options.outputOptions.forEach((opt, idx) => {
        if (opt.match(/^-(acodec|c:a)/)) index = idx;
      });
      return options.outputOptions[index].split(' ')[1];
    }
    return null;
  }

  // Better use this function rather than from this module
  const { resolveOptions } = require('./utils');
  let ffmpegChain = null;

  if (typeof inFile !== 'string') {
    throw new InvalidTypeError('Invalid type of input file', {
      actualType: TypeUtils.getType(inFile),
      expectedType: 'string'
    });
  }

  // Ensure outFile is either undefined, a string, or a plain object
  if (typeof outFile !== 'undefined'
    && (typeof outFile !== 'string' && !TypeUtils.isPlainObject(outFile))) {
    throw new InvalidTypeError('Invalid type of output file', {
      actualType: TypeUtils.getType(outFile),
      expectedType: 'string'
    });
  }

  // If `outFile` is omitted, check if the second argument (`options`) is mistakenly passed as `outFile`
  if (TypeUtils.isPlainObject(outFile) && typeof options !== 'undefined') {
    throw new InvalidTypeError('Unexpected object for output file. Did you mean to pass options?', {
      actualType: TypeUtils.getType(outFile),
      expectedType: 'string'
    });
  }

  // Check if the `outFile` is a plain object, if so, then it's the `options` object
  if (TypeUtils.isPlainObject(outFile)) {
    // Swap the `outFile` and `options` values
    options = outFile;
    outFile = undefined;
  }

  inFile = path.isAbsolute(inFile) ? inFile : path.resolve(inFile);

  // ==========================================
  //  Pre-conversion Process
  // ==========================================

  // Attach the interrupt handler to the SIGINT signal
  process.once('SIGINT', conversionInterruptedHandler);

  const convOptions = resolveOptions(options || {}, _AudioConverterOptions, true);
  const { quiet } = convOptions;  // Extract the 'quiet' field

  // Placeholder for the input and output audio metadata
  // This will be filled after ffmpeg executable binary check
  let inputMetadata = null;
  let outputMetadata = null;

  // Check whether the given audio file is exist and readable
  try {
    await fs.promises.access(inFile, fs.constants.R_OK);
  } catch (e) {
    quiet || log.error(`I/O Error [${e.code}]: Unable to access the input audio: `
      + $c.style([0, '~', 'W'], inFile));
    throw e;
  }

  // Create the output file name and change the file extension
  outFile = typeof outFile === 'string' ? path.resolve(outFile) : path.join(
    path.dirname(inFile), path.basename(inFile).replace(path.extname(inFile), '')
  );
  if (path.extname(outFile) === '') {
    outFile += `.${(getOutputExtname(convOptions) || path.extname(inFile).slice(1))}`;
  }

  // Store the file names only without their path directories
  const ioBaseFile = [
    path.basename(inFile).replace(/\.[^/.]+$/, ''),
    path.basename(outFile).replace(/\.[^/.]+$/, '')
  ];
  const extnames = [
    path.extname(inFile).slice(1),
    path.extname(outFile).slice(1)
  ];

  // Logic to prevent crash due to write the same file in-place
  if (inFile === outFile) {
    // If the input and output file are the same, add a suffix to the output file
    // to avoid overwriting the original file and if the output file already has a suffix,
    // increment the number
    if (ioBaseFile[1].match(/_\(copy(_[0-9]+)?\)$/)) {
      const copyNum = ioBaseFile[1].match(/_\(copy(_[0-9]+)?\)$/);
      ioBaseFile[1] = ioBaseFile[1].replace(
        /\(copy(_[0-9]+)?\)$/,
        `(copy${(copyNum ? `_${(parseInt(copyNum[1].slice(1)) || 0) + 1}` : '_1')})`
      );
    } else {
      ioBaseFile[1] = ioBaseFile[1] + '_(copy)';
    }
    outFile = path.join(path.dirname(outFile), `${ioBaseFile[1]}.${extnames[1]}`);
  }

  quiet || log.info(`Processing audio for ${$c.style([0, 'BY'], ioBaseFile[0])} ...`);

  // Check whether the `ffmpeg` binary is installed
  if (!(await checkFfmpeg(!quiet))) {
    const msg = 'Cannot find FFmpeg binary on your system.';
    quiet || log.error(msg + ' Aborting ...');
    throw new Error(msg);
  }

  inputMetadata = await getAudioMetadata(inFile);
  try {
    await fs.promises.access(outFile, fs.constants.R_OK);
    outputMetadata = await getAudioMetadata(outFile);
  // eslint-disable-next-line no-unused-vars
  } catch (_) { /* empty */ }

  // ==========================================
  //  Conversion Process
  // ==========================================

  const ffmpegOptions = resolveOptions(options, _FFmpegCommandOptions, true);

  // Set the FFmpeg path if found during setup
  if (HAS_FFMPEG && FFMPEG_PATH) {
    ffmpegChain = ffmpeg.setFfmpegPath(FFMPEG_PATH);
  }

  await new Promise((resolve, reject) => {
    // Perform audio conversion using ffmpeg
    ffmpegChain = (ffmpegChain ?? ffmpeg)({
      niceness: -5,
      ...ffmpegOptions,
      logger: quiet ? undefined : (ffmpegOptions.logger || log),
    })
      .addInput(inFile)  // IN
      .output(outFile);  // OUT

    // Only add non-custom options (e.g., bitrate, codec) if the `inputOptions`
    // and `outputOptions` are not set or they are an empty array, this make the
    // custom options are more prioritized
    if (
      (isNullOrUndefined(convOptions.inputOptions)
        || (Array.isArray(convOptions.inputOptions)
          && convOptions.inputOptions.length === 0)
      ) && (isNullOrUndefined(convOptions.outputOptions)
        || (Array.isArray(convOptions.outputOptions)
          && convOptions.outputOptions.length === 0)
      )
    ) {
      // Add each option only if present and specified
      // By using this logic, now user can convert an audio file with only specifying
      // the output audio format
      if (convOptions.bitrate) ffmpegChain.audioBitrate(convOptions.bitrate);
      if (convOptions.codec) ffmpegChain.audioCodec(convOptions.codec);
      if (convOptions.channels) ffmpegChain.audioChannels(convOptions.channels);
      if (convOptions.frequency) ffmpegChain.audioFrequency(convOptions.frequency);

      // Mandatory for output format
      // Note: Specifying the same output format as input may copy the input file
      //       with the same codec and format
      ffmpegChain.outputFormat(convOptions.format);
    } else {
      convOptions.inputOptions = Array.isArray(convOptions.inputOptions)
        ? convOptions.inputOptions
        : splitOptions(convOptions.inputOptions);
      convOptions.outputOptions = Array.isArray(convOptions.outputOptions)
        ? convOptions.outputOptions
        : splitOptions(convOptions.outputOptions);

      // Add each option only if present and specified
      ffmpegChain.inputOptions(convOptions.inputOptions);
      ffmpegChain.outputOptions(convOptions.outputOptions);
    }

    // Shared progression
    let progressStr = null;
    let progressInfo = {};

    // Handlers
    ffmpegChain
      .on('error', (err) => {
        quiet || process.stdout.write('\n');
        // Safely get the input file size and prevent any error
        // if the input file has been deleted unexpectedly
        let inputSize = NaN;
        try {
          inputSize = fs.statSync(inFile).size;
        // eslint-disable-next-line no-unused-vars
        } catch (_) { /* empty */ }

        // Log the error message
        if (!quiet) {
          log.error(`audioconv: ${err.message?.split(/[\r\n]/)[0]}`);
          log.error(`   Input Audio : ${$c.style([0, 'Y'], inFile)}`);
          log.error(`   Input Size  : ${$c.style([0, 'C'], inputSize)} Bytes `
            + `(${$c.style([0, 'C'], ((inputSize || 0) / (1024 ** 2)).toFixed(3))} MiB)`);
          log.error(`   Output Audio: ${$c.style([0, 'Y'], outFile)}`);
          log.line(null, process.stderr);
        }
        reject(err);
      })
      .on('progress', (info) => {
        progressInfo = info;
        progressStr = createConversionProgress(info, extnames);;
        // Write the progress information to the console
        if (!quiet) {
          process.stdout.clearLine && process.stdout.clearLine();
          process.stdout.write(progressStr);
        }
      })
      .on('end', async () => {
        // Update the progress
        progressStr = createConversionProgress({
          percent: 100,
          currentKbps: progressInfo.currentKbps,
          targetSize: ((await fs.promises.stat(outFile).catch((_e) => { })) || {}).size
            || progressInfo.targetSize
        }, extnames);
        if (!quiet) {
          process.stdout.clearLine && process.stdout.clearLine();
          process.stdout.write(progressStr + '\n');

          log.done('Audio conversion completed: '
            + $c.style([0, 'BY'], path.basename(outFile)));
        }

        // Remove the old audio file if `deleteOld` option is true
        if (convOptions.deleteOld) {
          await new Promise((resolve) => {
            setImmediate(async () => {
              await fs.promises.unlink(inFile);
              quiet || log.done(
                `Deleted old file: ${$c.style([0, 'BY'], path.basename(inFile))}`);
              resolve();
            });
          });
        }
        resolve();
      });

    ffmpegChain.run();
  });

  // ==========================================
  //  Post-conversion Process
  // ==========================================

  // Detach the interrupt handler from the SIGINT signal
  process.off('SIGINT', conversionInterruptedHandler);

  return {
    input: {
      path: inFile,
      name: path.basename(inFile),
      metadata: inputMetadata,
      deleted: convOptions.deleteOld
    },
    output: {
      path: outFile,
      name: path.basename(outFile),
      metadata: outputMetadata || await getAudioMetadata(outFile)
    }
  };
}


module.exports = {
  defaultOptions,
  splitOptions,
  writeErrorLog,
  createConversionProgress,
  resolveOptions,
  checkFfmpeg,
  convertAudio
};
