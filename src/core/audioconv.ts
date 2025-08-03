/**
 * `audioconv` stands for for Audio Converter, this module
 * provides a function to convert audios to any supported format utilizing the
 * `fluent-ffmpeg` module and `ffmpeg` library on the system.
 *
 * To convert the audio file, this module requires [`ffmpeg`](https://ffmpeg.org/) to be installed.
 *
 * @module    core/audioconv
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     0.2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import ffmpeg from 'fluent-ffmpeg';
import cliProgress from 'cli-progress';

import { DefaultLogger, NoneLogger, getType, isPlainObject, isUndefined, isString, createLogger } from '#/utils';
import { _AudioConverterOptions, _FFmpegCommandOptions, defaults, resolve as resolveOptions } from '#/utils/options';
import { style as $c } from '#colors';
import { getGlob, isDebugMode } from '#runtime/env';
import { InvalidTypeError } from '#error';
import type { AudioConverterOptions } from '#/core/internal/interfaces/options/AudioConverterOptions';
import type AudioConversionResult from '#/core/internal/interfaces/AudioConversionResult';
import { getContainerFromEncoder, getEncoderFromExtension, getFfmpeg, getFfprobe, splitFfmpegOptions } from './ffmpeg-cmdp';
import { audioConversionPreset } from '#/utils/progressbar';

/**
 * An object representing the information data when FFmpeg emits the `'progress'` event.
 *
 * @internal
 * @since    1.1.0
 * @see      {@link https://github.com/fluent-ffmpeg/node-fluent-ffmpeg#progress-transcoding-progress-information | `progress` Event}
 */
interface FfmpegProgressInfo {
  /** Total processed frame count. */
  frames: number;
  /** Framerate at which FFmpeg is currently processing. */
  currentFps: number;
  /** Throughput at which FFmpeg is currently processing. */
  currentKbps: number;
  /** Current size of the target file in kilobytes. */
  targetSize: number;
  /** The timestamp of the current frame. */
  timemark: string;
  /** An estimation of the progress percentage (may not be available depending on input). */
  percent?: number | undefined;
}

const defaultLogger = getGlob('logger', isDebugMode() ? createLogger('DEBUG') : DefaultLogger);
const HAS_FFMPEG = getGlob('hasFfmpeg', false);
const FFMPEG_PATH = getGlob('ffmpeg', { path: undefined }).path;
const FFPROBE_PATH = getGlob('ffprobe', { path: undefined }).path;
const FFMPEG_VERSION = getGlob('ffmpeg', { version: undefined }).version;
const FFPROBE_VERSION = getGlob('ffprobe', { version: undefined }).version;


// #region Audio Conversion

/**
 * Retrieves the metadata of an audio file using FFprobe.
 *
 * Needs the FFprobe binary to be installed on the system.
 *
 * @param file - The path to the audio file.
 * @returns Fulfilled with the metadata of the audio file.
 *
 * @throws {Error} If FFprobe fails to retrieve the metadata.
 *
 * @private
 * @since   2.0.0
 */
async function getAudioMetadata(file: string): Promise<ffmpeg.FfprobeData> {
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
 * If you specify the `outFile`, it will relative to the current working directory.
 * For example:
 * ```js
 * convertAudio('foo/in.wav', 'out.mp3', { ... });
 * // out.mp3 will be saved in current working directory
 * ```
 *
 * @param inFile - The input file path of the audio file to be converted.
 * @param outFile - The output file path of the converted audio file.
 * @param options - Options object for configuring the audio conversion process.
 * @returns An object containing the input and output audio file information.
 *
 * @throws {@link InvalidTypeError} If the input or output audio path is invalid type.
 * @throws {Error} If the input audio file is not exist or if there is an error
 *                 occurred during audio conversion.
 *
 * @example
 * convertAudio('path/to/audio.wav', { format: 'mp3', bitrate: '192k' })
 *   .then((result) => console.log('Conversion completed:', result.output.path))
 *   .catch(err => console.error('Conversion failed:', err));
 *
 * @public
 * @since   0.2.0
 */
export async function convertAudio(
  inFile: string,
  outFile?: string,
  options?: AudioConverterOptions): Promise<AudioConversionResult>;
export async function convertAudio(inFile: string, options?: AudioConverterOptions): Promise<AudioConversionResult>;
export async function convertAudio(
  inFile: string,
  outFile?: string,
  options?: AudioConverterOptions
): Promise<AudioConversionResult>;
export async function convertAudio(
  inFile: string,
  outFile?: string | AudioConverterOptions,
  options?: AudioConverterOptions
): Promise<AudioConversionResult> {
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
    if (!quiet) {
      process.stdout.write('\n');
      defaultLogger.error('Program interrupted. Exiting now ...');
    }
    setImmediate(() => {
      if (ffmpegChain) ffmpegChain.kill('SIGTERM');  // Terminate the ffmpeg process, it is better than `SIGKILL`
    });
  }

  function getOutputExtname(options: AudioConverterOptions): string | null {
    if (typeof options.format === 'string') return options.format.toLowerCase();
    let index = 0;
    if (Array.isArray(options.outputOptions) && options.outputOptions.length > 0) {
      options.outputOptions.forEach((opt, idx) => {
        if (opt.match(/^-(acodec|c:a)/)) index = idx;
      });
      return options.outputOptions[index].split(' ')[1];
    }
    return getContainerFromEncoder(options?.codec as string) || null;
  }

  if (!isString(inFile)) {
    throw new InvalidTypeError('Invalid type of input file', {
      actualType: getType(inFile),
      expectedType: 'string'
    });
  }

  // Ensure outFile is either undefined, a string, or a plain object
  if (!isUndefined(outFile) && (!isString(outFile) && !isPlainObject(outFile))) {
    throw new InvalidTypeError('Invalid type of output file', {
      actualType: getType(outFile),
      expectedType: 'string'
    });
  }

  // If `outFile` is omitted, check if the second argument (`options`) is mistakenly passed as `outFile`
  if (isPlainObject(outFile) && !isUndefined(options)) {
    throw new InvalidTypeError('Unexpected object for output file. Did you mean to pass options?', {
      actualType: getType(outFile),
      expectedType: 'string'
    });
  }

  // Check if the `outFile` is a plain object, if so, then it's the `options` object
  if (isPlainObject(outFile)) {
    // Swap the `outFile` and `options` values
    options = outFile;
    outFile = undefined;
  }

  let ffmpegChain: ffmpeg.FfmpegCommand | null = null;
  options ??= defaults.AudioConverterOptions;
  inFile = path.isAbsolute(inFile) ? inFile : path.resolve(inFile);

  // ==========================================
  //  Pre-conversion Process
  // ==========================================

  // Attach the interrupt handler to the SIGINT signal
  process.once('SIGINT', conversionInterruptedHandler);

  const ffmpegOptions = resolveOptions(options as ffmpeg.FfmpegCommandOptions, // need to be cast to `FfmpegCommandOptions`
    _FFmpegCommandOptions, true);
  const convOptions = resolveOptions(options, _AudioConverterOptions, true);
  const { quiet } = convOptions;  // Extract the 'quiet' field
  const logger = quiet ? NoneLogger : defaultLogger;
  const progressBar = new cliProgress.SingleBar({
    hideCursor: true,            // Hide cursor during progress
    gracefulExit: true,          // Ensure proper exit even if progress bar isn't stopped manually
    clearOnComplete: false,      // Keep the progress bar visible after completion
    noTTYOutput: isDebugMode(),  // Optionally suppress TTY output if in debug mode
    notTTYSchedule: 500,         // Update interval for non-TTY output (e.g., for file logging)
    // Dynamically adjust bar size based on terminal width for better aesthetics
    barsize: ((process.stdout.columns ?? 80) >= 80) ? 40 : 15,
    stream: process.stdout,      // Direct progress output to stdout
    align: 'left',               // Align progress bar to the left
  }, audioConversionPreset);

  // We do not know if the logger within the `fluent-ffmpeg` is actually working or not
  // but for consistency reason, we will still use it
  ffmpegOptions.logger = quiet ? undefined : logger;

  // Placeholder for the input and output audio metadata
  // This will be initiated after ffmpeg executable binary check
  let inputMetadata: ffmpeg.FfprobeData | null = null;

  // Check whether the given audio file is exist and readable
  try {
    await fs.promises.access(inFile, fs.constants.F_OK | fs.constants.R_OK);
  } catch (err) {
    if (err instanceof Error) {
      if (!quiet) {
        defaultLogger.error(
          `I/O Error [${(err as NodeJS.ErrnoException).code}]: Unable to access the input audio: `
          + $c(['~', 'W'], inFile)
        );
      }
      throw err;
    }
  }

  const correctedFormatFromCodec = getContainerFromEncoder(
    convOptions.codec ?? defaults.AudioConverterOptions.codec
  ) as string;
  // Fix if the given format is not the same as the codec
  if (correctedFormatFromCodec !== convOptions.format) {
    logger.debug(`Correcting output audio format from ${$c('C', convOptions.format ?? 'unknown')} to ${$c('C', correctedFormatFromCodec)}`);
    convOptions.format = correctedFormatFromCodec;
  }

  // Create the output file name and change the file extension
  outFile = isString(outFile) ? path.resolve(outFile) : path.join(
    path.dirname(inFile), path.basename(inFile).replace(path.extname(inFile), '')
  );
  if (path.extname(outFile) === '') {
    outFile += `.${(getOutputExtname(convOptions)
      || getContainerFromEncoder(getEncoderFromExtension(path.extname(inFile)) as string))}`;
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

  logger.info(`Processing audio for ${$c('BY', ioBaseFile[0])} ...`);

  logger.debug(`Getting the input audio metadata...`);
  inputMetadata = await getAudioMetadata(inFile);

  // Get the FFmpeg binary
  const [ ffmpegPath, ffmpegVersion ] = HAS_FFMPEG
    ? [ FFMPEG_PATH, FFMPEG_VERSION ]  // From setup
    : ((await getFfmpeg({ timeout: 3 * 1000 })) ?? []);  // Otherwise, try to get it
  // Get the FFprobe binary
  const [ ffprobePath, ffprobeVersion ] = FFPROBE_PATH
    ? [ FFPROBE_PATH, FFPROBE_VERSION ]  // From setup
    : ((await getFfprobe({ timeout: 3 * 1000 })) ?? []);

  // Throw an error if the FFmpeg binary is not found
  if (!ffmpegPath) {
    throw new Error(
      `FFmpeg binary not found. Please ensure that FFmpeg is installed and available in your PATH, or set the ` +
      `FFMPEG_PATH environment variable to the path of the FFmpeg binary.`
    );
  }

  // To check if the output file already exists
  const isOutputFileExist = (await fs.promises.stat(outFile)).isFile();

  // Warn if output file is exist
  if (isOutputFileExist) {
    logger.warn('Looks like the output file already exist, overwriting...');
  }
  // TODO: Add interactive dialog to choose whether to overwrite or append the output file

  // ==========================================
  //  Conversion Process
  // ==========================================

  await new Promise<void>((resolve, reject) => {
    // Perform audio conversion using FFmpeg
    ffmpegChain = ffmpeg(ffmpegOptions)
      .addInput(inFile)  // IN
      .output(outFile);  // OUT

    logger.debug(`Set default FFmpeg binary to ${$c('Y', ffmpegPath)} (version: ${ffmpegVersion})`);
    ffmpegChain = ffmpegChain.setFfmpegPath(ffmpegPath);

    logger.debug(`Using FFmpeg binary: ${$c('Y', ffmpegPath)} (version: ${ffmpegVersion})`);
    if (ffprobePath) {
      logger.debug(`Using FFprobe binary: ${$c('Y', ffprobePath)} (version: ${ffprobeVersion})`);
      ffmpegChain = ffmpegChain.setFfprobePath(ffprobePath);
    }

    // -- bitrate
    if (convOptions.bitrate) ffmpegChain.audioBitrate(convOptions.bitrate);
    // -- codec
    if (convOptions.codec) ffmpegChain.audioCodec(convOptions.codec);
    // -- channels
    if (convOptions.channels) ffmpegChain.audioChannels(convOptions.channels);
    // -- frequency
    if (convOptions.frequency) ffmpegChain.audioFrequency(convOptions.frequency);
    // -- format
    if (convOptions.format) ffmpegChain.toFormat(convOptions.format);
    else {
      logger.debug('No output audio format given, trying to resolve...');
      const usedFormat = getContainerFromEncoder(convOptions.codec ?? defaults.AudioConverterOptions.codec) as string;
      convOptions.format = usedFormat;
      ffmpegChain.toFormat(usedFormat);
      logger.debug(`Using ${$c('C', usedFormat)} for output audio format`);
    }

    convOptions.inputOptions = splitFfmpegOptions(convOptions.inputOptions);
    convOptions.outputOptions = splitFfmpegOptions(convOptions.outputOptions);

    ffmpegChain.inputOptions(['-hide_banner', ...convOptions.inputOptions]);
    ffmpegChain.outputOptions(convOptions.outputOptions);

    // Shared progression
    let progressInfo: FfmpegProgressInfo | undefined;
    let progressBarSettled = false;
    let hasError = false;

    const progressBarCleanup = (shouldUpdate?: boolean) => {
      if (progressBarSettled && !quiet && !hasError) {
        if (shouldUpdate && progressInfo) {
          // Update the progress bar to 100% if it is settled
          progressBar.update(100, {
            percentage: 100,
            targetSize: progressInfo.targetSize || 0,
            targetSize_mb: ((progressInfo.targetSize || 0) / 1024).toFixed(2),
            currentKbps: progressInfo.currentKbps || 0
          });
        }
        progressBar.stop();
      } else {
        if (!quiet) process.stdout.write('\n');
      }
    }

    // Handlers
    ffmpegChain
      .on('error', (err) => {
        hasError = true;
        // Cleanup the progress bar if it is settled
        progressBarCleanup(false);

        const errMessage = err.message.split(/[\r\n]/)[0].split(':')[0] + `: ${err.message.split('\n')[1]}`;
        // Safely get the input file size and prevent any error
        // if the input file has been deleted unexpectedly
        let inputSize = NaN;
        try {
          // Get the input file size. ignoring any errors
          inputSize = fs.statSync(inFile).size;
        } catch {
          // This error is not critical, we can still proceed and reject the promise
          if (defaultLogger.levelStr === 'DEBUG') defaultLogger.error(
            `Failed to get the input file size for ${$c('Y', inFile)}: ${errMessage}`
          );
        }

        // Log the error message
        defaultLogger.error(`ffmpeg: ${errMessage}`);
        [
          `Input Audio : ${$c('Y', inFile)}`,
          `Input Size  : ${$c('C', String(inputSize))} B `
            + `(${$c('C', ((inputSize || 0) / (1024 ** 2)).toFixed(3))} MiB)`,
          `Output Audio: ${$c('Y', outFile)}`,
        ].forEach(msg => defaultLogger.write(` ${$c('~', '--')} ${msg}\n`, null, defaultLogger.stderr));
        defaultLogger.line(60, '\r', process.stderr);

        fs.unlinkSync(outFile);  // Delete the output file
        reject(err);
      })
      .on('progress', (info) => {
        progressInfo = info;
        if (!progressBarSettled && !quiet) {
          progressBarSettled = true;
          // Create the progress bar with initial values
          progressBar.start(100, 0, {
            percentage: info.percent,
            targetSize: info.targetSize || 0,
            targetSize_mb: ((info.targetSize || 0) / 1024).toFixed(2),
            currentKbps: info.currentKbps || 0
          });
        }

        // Update the progress bar with the current progress
        if (!quiet) {
          progressBar.update(info.percent as number, {
            percentage: info.percent,
            targetSize: info.targetSize || 0,
            targetSize_mb: ((info.targetSize || 0) / 1024).toFixed(2),
            currentKbps: info.currentKbps || 0
          });
        }
      })
      .on('end', async () => {
        // Cleanup the progress bar
        progressBarCleanup(true);

        logger.done(`Audio conversion completed: ${$c([0, 'BY'], path.basename(outFile))}`);
        logger.debug(`Saved output audio to ${$c('Y', outFile)}`);

        // Remove the old audio file if `deleteOld` option is true
        if (convOptions.deleteOld) {
          await fs.promises.unlink(inFile);
          if (!quiet) {
            logger.done(`Deleted old file: ${$c([0, 'BY'], path.basename(inFile))}`);
          }
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
      deleted: Boolean(convOptions.deleteOld)  // Indicate if the input file was deleted
    },
    output: {
      path: outFile,
      name: path.basename(outFile),
      metadata: await getAudioMetadata(outFile)
    }
  };
}
