/**
 * YTMP3 core library for retrieving video information and downloading audio from YouTube.
 *
 * This module provides APIs to easily download YouTube videos (also supports YouTube Music) and convert them to MP3 format.
 * The output MP3 files are stored in the current working directory (unless otherwise specified).
 *
 * You can download a single YouTube video or a bunch of YouTube videos from a file as audio files and convert them to MP3 format.
 * If you want to download a single YouTube video, please use the {@link download} function.
 * Or if you want to download a bunch of YouTube videos, first you need to store all YouTube URLs in a file and then use the
 * {@link batchDownload} function to download them by passing the path of the file.
 *
 * @example <caption> Download a single YouTube video </caption>
 * ```js
 * ytmp3.download('https://www.youtube.com/watch?v=<VIDEO_ID>')
 *   .then(result => console.log('Download complete:', result.path))
 *   .catch(err => console.error('Download failed:', err));
 * ```
 *
 * @example <caption> Download a batch of YouTube videos </caption>
 * ```js
 * ytmp3.batchDownload('./urls.txt')
 *   .then(results => {
 *     for (const [id, result] of Object.entries(results)) {
 *       // The error is within the result and is an array
 *       if (result.error) throw result.error[0];
 *       console.log('Download complete:', result.path);
 *     }
 *   });
 *   // All errors were never rejected, access them in `results[<video_id>].error` property
 * ```
 *
 * @module    core/ytmp3
 * @version   5.0.0
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import fs from 'node:fs';
import path from 'node:path';
import { inspect } from 'node:util';
import { Innertube, type SessionOptions, Types, UniversalCache } from 'youtubei.js';
import type { FfprobeData } from 'fluent-ffmpeg';

import type { GetInfoOptions, DownloadOptions } from './internal/interfaces/options/index.js';
import { getGlob, isDebugMode, setGlob, setInterrupted } from '#runtime/env.js';
import {
  type Logger,
  type URLLike,
  type BarControl,
  DefaultLogger,
  isNullish,
  style,
  createLogger,
  isNonNullish,
  isPlainObject,
  getExtensionFromMime,
  LogLevel,
  createLoadingBar,
  waitForConnectivity,
  STUB_CLASSES_DIR,
  ROOTDIR,
} from '#/utils/index.js';
import { captureStderr, logError, parseParserError, prettyPrintParserError } from '#/utils/diag/index.js';
import { defaults, merge, resolveInnertubeConfig } from '#/utils/options.js';
import { createDownloadResult, extractAndValidateURL, generateStubClass, parseOutFile, resolveSession } from '#/core/internal/index.js';
import { VInfoCache } from '#/cache.js';
import VideoInfo from './internal/classes/VideoInfo.js';
import { defaultHandler } from './helpers/handler.js';
import type DownloadResult from './internal/interfaces/DownloadResult.js';
import type AudioConversionResult from './internal/interfaces/AudioConversionResult.js';
import { convertAudio } from './audioconv.js';
import { type PackageJSON } from './config.js';

/**
 * Represents a single video format. Re-exported from `youtubei.js`.
 * @public
 */
export type Format = ReturnType<VideoInfo['full']['chooseFormat']>;

// --- Module-scoped constants
const defaultLogger = getGlob('logger', isDebugMode() ? createLogger('DEBUG') : DefaultLogger) as Logger;
const defaultVInfoCache = new VInfoCache(undefined, { debug: isDebugMode() });  // Default video info cache
const HAS_SETUP = getGlob('ready', false);
const HAS_CONNECTIVITY = HAS_SETUP ? getGlob('hasConnectivity', false) === true : undefined;
const pkgJson = ((): PackageJSON | null => {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOTDIR, 'package.json'), 'utf-8'));
  } catch (err) {
    if (defaultLogger.levelStr === 'DEBUG' || isDebugMode())
      defaultLogger.warn(`Failed to load package.json: ${(err as Error).message}`);
    return null;
  }
})();
let globalInnertubeSession = getGlob('innertube_session', undefined);

/**
 * The version of **YTMP3-JS**.
 * @public
 */
export const version = pkgJson?.version ?? '0.0.0-dev';
/**
 * An object representing the version of **YTMP3-JS** in more descriptive way.
 *
 * This object has 3 properties:
 * - `major`
 * - `minor`
 * - `patch`
 * - `preRelease`
 *
 * @public
 */
export const version_info = (() => {
  const versionList = version.split(/[.-]/).filter(Boolean);
  return {
    major: parseInt(versionList[0], 10),
    minor: parseInt(versionList[1], 10),
    patch: parseInt(versionList[2], 10),
    preRelease: versionList[3] || 'stable'
  };
})();

// #region Internal Utils

function resolveLogger(options: DownloadOptions): Logger {
  return options.quiet
    ? createLogger('ERROR')
    : ([options.debug, isDebugMode()].find(Boolean)
      ? defaultLogger.levelStr === 'DEBUG' ? defaultLogger : createLogger('DEBUG', {
          stdout: defaultLogger.stdout, stderr: defaultLogger.stderr
        })
      : defaultLogger);
}

function resolveSessionConfig(options: DownloadOptions) {
  const globalInnertubeConfig = getGlob('__globalInnertubeConfig', defaults.InnerTubeConfig) as SessionOptions;
  return resolveInnertubeConfig(globalInnertubeConfig, [ options.innerTubeConfig ?? {} ]);
}

function resolveOutDir(options: DownloadOptions): string {
  return path.isAbsolute(options.outDir ?? '.')
    ? (options.outDir ?? path.resolve('.')) : path.resolve(options.cwd ?? '.', options.outDir ?? '.');
}

// #region Info Getters

/**
 * Retrieves video information from YouTube using `Innertube`.
 * Supports both single video URL or ID input and an array of such inputs.
 *
 * If a list of targets is provided, a map of `{ videoId: VideoInfo | null }` is returned.
 * If a single target is provided, a single `VideoInfo` (or `null`) is returned.
 *
 * During pre-validation input, any duplicates input URLs or IDs will be removed.
 *
 * ### Caching
 * If `useCache` is set to `true`, a global `UniversalCache` will be used,
 * or if is set to an instance of `UniversalCache`, it will be used instead.
 * Otherwise, if set to `false`, no caching will be used and caching algorithm will be disabled.
 *
 * ### Retry Behavior
 * The function retries both session creation and video info fetching
 * up to `options.maxRetries` times, with warnings logged on failure.
 * If the `maxRetries` is set to `Infinity`, it will retry indefinitely
 * until successful, this also affect the internet connectivity check.
 *
 * ### Debug Mode
 * If logging level allows, this function also captures and prints
 * parser errors generated during video info fetching with `Innertube.getInfo(...)`.
 * These include auto-generated runtime class definitions such as:
 *
 * ```ts
 * class SomeMissingNode extends YTNode {
 *   static type = 'SomeMissingNode';
 *   constructor(data: RawNode) {
 *     super();
 *   }
 * }
 * ```
 * 
 * If that happens, the system will automatically generate the stub classes for the missing nodes
 * in the YTMP3-JS home directory, see {@link STUB_CLASSES_DIR} for more information.
 *
 * This is for developer diagnostics only, and does not affect user output.
 * If you want to report it and help us resolve it, please do so at <https://github.com/LuanRT/YouTube.js/issues>.
 *
 * @example
 * ```js
 * const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
 *
 * await getInfo(url);      // => VideoInfo
 * await getInfo([ url ]);  // => { dQw4w9WgXcQ: VideoInfo }
 * ```
 *
 * @param target - A URL-like input or array of such inputs.
 * @param options - Optional settings, including suppressing log output, retries, cache, and session injection.
 *
 * @returns A single {@linkcode VideoInfo} or a mapping of `videoId -> VideoInfo | null`.
 *
 * @throws If the Innertube session fails to initialize or if all retries to fetch video info fail.
 *
 * @public
 * @since 5.0.0
 */
export async function getInfo(target: URLLike, options?: GetInfoOptions): Promise<VideoInfo | null>;
export async function getInfo(target: URLLike[], options?: GetInfoOptions): Promise<Record<string, VideoInfo | null>>;
export async function getInfo(
  target: URLLike | URLLike[],
  options?: GetInfoOptions
): Promise<VideoInfo | Record<string, VideoInfo | null> | null> {
  if (!isPlainObject(options)) options = defaults.GetInfoOptions;  // Fallback to defaults if not provided

  const log: Logger = options.quiet
    ? createLogger('ERROR')  // Only log errors in quiet mode
    : ([options.debug, isDebugMode()].find(Boolean)
      ? defaultLogger.levelStr === 'DEBUG' ? defaultLogger : createLogger('DEBUG', {
          stdout: defaultLogger.stdout, stderr: defaultLogger.stderr
        })
      : defaultLogger);
  const logLine = (width?: number, prefix?: string) => {
    if (log.level >= LogLevel.INFO) log.line(width, prefix);
  }

  const setupLoadingBar = (): BarControl => {
    if (options.quiet) return {
      start: () => { /* empty */ },
      stop: () => { /* empty */ },
    };

    const cols = process.stdout.columns ?? 80;
    return createLoadingBar({
      barWidth: cols < 50 ? cols - 10 : cols / 2.5,
      segmentLength: cols / 10,
      interval: cols > 80 ? 10 : 20
    });
  }
  const loadingBar = setupLoadingBar();

  const maxRetries = [options.maxRetries, defaults.GetInfoOptions.maxRetries].find(isNonNullish) as number;
  const globalInnertubeConfig = getGlob('__globalInnertubeConfig', defaults.InnerTubeConfig);
  const innerTubeConfig = resolveInnertubeConfig(globalInnertubeConfig, [ options.innerTubeConfig ?? {} ]);
  const useCache = [options.useCache, defaults.GetInfoOptions.useCache].find(isNonNullish);
  const icache = useCache instanceof UniversalCache
    ? useCache
    : (useCache === true ?
      [options?.innerTubeConfig?.cache, defaults.GetInfoOptions.innerTubeConfig.cache].find(isNonNullish) as UniversalCache
      : undefined);  // Do not use any cache if explicitly set to false
  // Retrieve session from global or use from options
  let session = resolveSession(globalInnertubeSession ?? null, options?.session ?? null, log);
  const usedClient = innerTubeConfig.client_type as Types.InnerTubeClient ?? defaults.InnerTubeConfig.client_type;

  const isTargetArray = Array.isArray(target);
  target = Array.isArray(target) ? target : [target];
  const urls = [] as URL[];
  const videoIds = [] as string[];
  const seenIds = new Set<string>();
  let validationError: Error | null = null;

  for (let i = 0; i < target.length; i++) {
    const t = target[i];
    const c = style('Y', `[${i + 1}/${target.length}]`);

    try {
      log.info(`${c} Extracting target URL...`);
      const [url, videoId] = extractAndValidateURL(t);

      if (seenIds.has(videoId)) {
        log.info(`Skipping duplicate video ID: ${style('C', videoId)}`);
        continue;
      }

      urls.push(url);
      videoIds.push(videoId);
      seenIds.add(videoId);
      validationError = null;  // Reset validation error

      log.debug(`${c} Target URL extracted: ${style('C', videoId)}`);
    } catch (err) {
      if (err instanceof Error) {
        validationError = err;
        if (target.length > 1) log.warn(`${c} Failed to extract or validate: ${style('R', t?.toString())}`);
        else logError(`${c} Failed to extract or validate: ${style('R', t?.toString())} %s`, err, log);
        continue;
      }
    }
  }

  if (!urls.length && !videoIds.length && validationError) {
    // No URLs or video IDs were found, then throw the validation error
    throw validationError;
  } else {
    log.info(`Using ${
      style('G', String(videoIds.length))
    } unique video ID${videoIds.length === 1 ? '' : 's'}.`);
  }

  logLine();

  // Check for internet connectivity
  // Only check if `noInternetCheck` is not enabled and if already connected during setup
  if (!options?.noInternetCheck || HAS_CONNECTIVITY) {
    log.debug('Checking for internet connectivity...');
    const online = await waitForConnectivity({
      timeout: maxRetries === Infinity ? Infinity : undefined,
      logger: options?.quiet ? undefined : log,
    });
    if (!online) {
      throw new Error('Internet connectivity is required to retrieve video info.');
    }
  }

  // Create the Innertube session
  // This should be run after URL validation
  let innertubeCreateError: Error | null = null;
  if (isNullish(session)) {
    log.info(`Creating the Innertube session ${useCache ? 'with' : 'without'} caching algorithm...`);
    loadingBar.start();  // Start the non-progressive loading bar

    let retries = 0;
    do {
      try {
        session = await Innertube.create({
          ...merge(globalInnertubeConfig, innerTubeConfig, false),
          cache: innerTubeConfig.cache instanceof UniversalCache ? innerTubeConfig.cache : icache,
        });
        // Set as global session if global session is not set
        if (isNullish(globalInnertubeSession)) {
          globalInnertubeSession = session;
          setGlob('innertube_session', session);  // This will only be set if the setup phase has completed
        }
        innertubeCreateError = null;  // Reset the error

        loadingBar.stop();  // Stop the loading bar
        log.done('\u2714 Innertube session created.');
        log.debug('Innertube session:', inspect(
          { ...session.session, api_key: '***', cookie: session.session.cookie ? '***' : undefined },  // Hide sensitive info
          { colors: true, compact: false, depth: 0 }
        ));
        log.debug('Innertube cache:', style('Y', session.session.cache?.cache_dir ?? '<null>'));
        break;
      } catch (createError) {
        loadingBar.stop();  // Stop the loading bar on error
        innertubeCreateError = createError as Error;
        if (retries++ < maxRetries) {
          log.warn(`Failed to create Innertube session. Retrying [${retries}/${maxRetries}]...`);
          loadingBar.start();  // Restart the loading bar on retry
          continue;  // Try again
        }
      }
    } while (retries < maxRetries);
  }

  if (innertubeCreateError instanceof Error) {
    const cause = innertubeCreateError instanceof TypeError
      ? (innertubeCreateError as Error & { cause: Error }).cause
      : null;
    logError('Failed to create Innertube session: %s', (cause || innertubeCreateError), log);
    throw (cause || innertubeCreateError);  // Re-throw to indicate critical failure
  }

  const thisSession = session as Innertube;
  const videoInfos = {} as Record<string, VideoInfo | null>;

  // -- Session login
  if (thisSession.session.logged_in === true) {
    log.info('Current Innertube session has logged in.');
  } else {
    log.info('Current Innertube session has not logged in.');
  }

  // TODO: Fetch the player response as raw response,
  //       this way we can caching it without calling the `VInfoCache.serialize`
  //       which does another API call to fetch the raw responses (double bandwidth usage).
  //       But that will only do once if the cache is not exist.

  logLine();

  for (const videoId of videoIds) {
    const videoId_C = style('BM', videoId);

    log.debug(`** ${style(['**', 'BM'], 'useCache')} = ${
      style(useCache ? 'G' : 'R', useCache ? 'Enabled' : 'Disabled')}`);
    if (useCache) {  // If caching is enabled, log the cache paths
      log.debug(`** Innertube cache path: ${style('Y', icache?.cache_dir ?? '<null>')}`);
      log.debug(`** Video info cache path: ${style('Y', defaultVInfoCache.cacheDir)}`);
    }

    // Check if video info has locally stored cache
    if (useCache) {
      log.info(`{${videoId_C}}: Checking for local cache...`);
      if (await defaultVInfoCache.has(videoId, true)) {
        const cachedVideoInfo = await defaultVInfoCache.get(videoId, thisSession.actions);
        if (cachedVideoInfo) {
          // Cache hit
          log.debug(`{${videoId_C}}: Cache hit!`);
          log.info(`{${videoId_C}}: Using cached video info.`);
          videoInfos[videoId] = cachedVideoInfo;

          if (videoIds.length !== 1) logLine();
          continue;
        } else {
          // Cache miss
          log.debug(`{${videoId_C}}: Cache miss!`);
        }
      } else {
        // Cache miss
        log.debug(`{${videoId_C}}: Cache miss!`);
      }
    }

    let videoInfo: VideoInfo | undefined;
    let retries = 0;
    let fetchError: Error | null = null;
    log.info(`{${videoId_C}}: Fetching video info from YouTube...`);
    loadingBar.start();

    do {
      try {
        // Capture the parser error from stderr (if any)
        const parserError = await captureStderr(async () => {
          videoInfo = new VideoInfo(await thisSession.getInfo(videoId, { client: usedClient }), { videoId });
        });
        loadingBar.stop();  // Stop the loading bar on success
        prettyPrintParserError(parserError, log);

        // Generate stub classes if any missing nodes were found
        if (parserError) {
          const { classNames, classDefinitions } = parseParserError(parserError);
          const stubClasses = classNames.map((className, idx) => {
            const classDef = classDefinitions[idx];
            return generateStubClass(className, classDef, STUB_CLASSES_DIR, log);
          });
          await Promise.allSettled(stubClasses);
          log.warn(`Processed ${
            style('Y', String(classNames.length))
          } stub class${classNames.length === 1 ? '' : 'es'} for missing nodes.`);
        }

        fetchError = null;  // Reset the error
        if (videoIds.length !== 1) logLine();
        break;
      } catch (err) {
        loadingBar.stop();  // Stop the loading bar on error
        fetchError = err as Error;
        if (retries++ < maxRetries) {
          log.warn(`Failed to fetch video info. Retrying [${retries}/${maxRetries}]...`);
          loadingBar.start();  // Restart the loading bar on retry
          continue;  // Try again
        }
      }
    } while (retries < maxRetries);

    if (fetchError instanceof Error) {
      logError(`Failed to fetch video info for ${videoId}: %s`, fetchError, log);
      throw fetchError;  // Throw back to caller
    }

    // Check if the video content is playable
    if (videoInfo instanceof VideoInfo) {
      log.debug(
        `Video playability status: ${style('Y', videoInfo.playabilityStatus?.status ?? '<unknown>')}`
      );
      if (videoInfo.playabilityStatus?.status !== 'OK') {
        log.warn(`Video content is not playable (${
          style('Y', videoInfo.playabilityStatus?.status ?? '<unknown>')})`);
      }

      // Caching the video info, optionally
      if (useCache) {
        if (log.levelStr === 'DEBUG') log.line();
        log.debug(`{${videoId_C}}: Serializing the video info...`);
        const serializedVideoInfo = await VInfoCache.serialize(videoInfo.full);

        log.debug(`{${videoId_C}}: Caching video info...`);
        await defaultVInfoCache.set(serializedVideoInfo);

        log.debug(`{${videoId_C}}: \u2714 Video info was successfully cached.`);
      }
    }

    log.done(`{${videoId_C}}: \u2714 Video info was successfully fetched.`);
    log.debug(`{${videoId_C}}: Fetched info is ${videoInfo instanceof VideoInfo ? 'valid' : 'null'}.`);
    videoInfos[videoId] = videoInfo instanceof VideoInfo ? videoInfo : null;
  }

  // Return the object if target is an array, otherwise return the first video info
  return isTargetArray ? videoInfos : videoInfos[videoIds[0]];
}

// #region Downloaders

function selectFormat(videoInfo: VideoInfo, options: DownloadOptions, log: Logger): Format | null {
  const formatOptions = isPlainObject(options.formatOptions)
    ? options.formatOptions
    : defaults.DownloadOptions.formatOptions;
  log.debug('Using format options:', inspect(formatOptions, {
    colors: true, depth: 1, compact: false
  }));
  try {
    return videoInfo.full.chooseFormat(formatOptions);
  } catch (fmtErr) {
    if (fmtErr instanceof Error) {
      fmtErr.name = 'InnertubeError';
      logError(null, fmtErr, log);
      throw fmtErr;
    }
  }
  return null;
}

function logFormatInfo(selectedFormat: Format, videoInfo: VideoInfo, log: Logger) {
  log.info(`Using the selected format with itag ${style('C', String(selectedFormat?.itag))}`);
  [
    `Audio bitrate: ${style('C', (selectedFormat?.bitrate as number / 1e3).toFixed(2) + ' kbps')}`,
    `Audio channels: ${style('C',
      selectedFormat?.audio_channels === 2
      ? 'stereo (2)'
      : (selectedFormat?.audio_channels === 1 ? 'mono (1)' : '<unknown>'))}`,
    `Audio sample rate: ${style('C', String(selectedFormat?.audio_sample_rate ?? '<unknown>') + ' Hz')}`,
    `Content size: ${style('C', ((selectedFormat?.content_length ?? 0) / 1024 ** 2).toFixed(2) + ' MiB')}`,
    `Duration: ${style('C', ((videoInfo.full.page[0].video_details?.duration ?? 0) / 60).toFixed(2) + ' mins')}`
  ].forEach(msg => log.level < LogLevel.INFO ? {} : log.write(` ${style('~', '--')} ${msg}\n`, null, log.stdout));
}

async function handleDownload(
  session: Innertube,
  videoId: string,
  range: { start: number, end: number },
  outDir: string,
  filename: string,
  downloadHandler: typeof defaultHandler,
  videoInfo: VideoInfo,
  selectedFormat: Format,
  log: Logger,
  controller: AbortController,
  maxRetries: number
): Promise<string> {
  let stream: ReadableStream<Uint8Array> | null = null;
  let outputFile: string | undefined = undefined;
  let retries = 0;
  let downloadError: Error | null = null;
  const sigintHandler = () => {
    log.error('Received SIGINT. Aborting download...');
    controller.abort();
    setInterrupted();
  };

  do {
    try {
      if (fs.existsSync(path.join(outDir, filename))) {
        const stat = await fs.promises.stat(path.join(outDir, filename));
        if (stat.size < range.end) range.start = stat.size;
      }
      process.once('SIGINT', sigintHandler);
      stream = await session.download(videoId, {
        ...defaults.DownloadOptions.formatOptions,
        range,
      });
      outputFile = await downloadHandler(stream, videoInfo, {
        outDir,
        filename,
        selectedFormat,
        quiet: false,
        logger: log,
        signal: controller.signal,
      });
      downloadError = null;
      stream = null;
      break;
    } catch (err) {
      downloadError = err as Error;
      const bytesWritten = (err as Error & { bytesWritten?: number }).bytesWritten
        ?? (fs.existsSync(path.join(outDir, filename))
          ? (await fs.promises.stat(path.join(outDir, filename))).size : undefined);
      if (bytesWritten) range.start = bytesWritten;
      if ((err as Error).name === 'AbortError') break;
      if (retries++ < maxRetries) {
        log.warn(`Failed to download content. Retrying [${retries}/${maxRetries}]...`);
        continue;
      }
    } finally {
      process.off('SIGINT', sigintHandler);
    }
  } while (retries < maxRetries);

  if (downloadError instanceof Error) {
    logError('Failed to download content %s', downloadError, log);
    throw downloadError;
  }
  return outputFile as string;
}

function logDownloadSummary(
  videoId_C: string,
  videoInfo: VideoInfo,
  outputFile: string,
  log: Logger,
  logLine: (width?: number, prefix?: string) => void
) {
  log.done(`{${videoId_C}} \u2714 Successfully downloaded content.`);
  [
    `Title: ${style('C', videoInfo?.title as string)}`,
    `Author: ${style('C', (videoInfo?.author.name as string).replace(/\s-\sTopic$/, ''))}`,
    `URL: ${style('C', videoInfo?.videoUrl as string)}`,
    `File: ${style('C', outputFile as string)}`,
  ].forEach(msg => log.level < LogLevel.INFO  ? {} : log.write(
    ` ${style('~', '--')} ${msg}\n`, null, log.stdout)
  );
  logLine();
}

async function handleAudioConversion(
  outputFile: string,
  options: DownloadOptions,
  log: Logger
): Promise<AudioConversionResult | null> {
  if (options?.convertAudio) {
    try {
      return await convertAudio(outputFile, {
        ...(options.converterOptions ?? {}),
      });
    } catch (err) {
      logError('Failed to convert audio %s', err as Error, log);
      throw err as Error;
    }
  }
  return null;
}

export async function download(target: URLLike, options?: DownloadOptions): Promise<DownloadResult> {
  if (!isPlainObject(options)) options = defaults.DownloadOptions;
  const log = resolveLogger(options);
  const logLine = (width?: number, prefix?: string) => {
    if (log.level >= LogLevel.INFO) log.line(width, prefix);
  };
  const downloadHandler = options.handler ?? defaultHandler;
  const maxRetries = [options.maxRetries, defaults.GetInfoOptions.maxRetries].find(isNonNullish) as number;
  const innerTubeConfig = resolveSessionConfig(options);
  let session = resolveSession(globalInnertubeSession ?? null, options?.session ?? null, log);
  const outDir = resolveOutDir(options);

  const videoInfo = await getInfo(target, { ...options, innerTubeConfig });
  if (isNullish(videoInfo)) {
    const msg = 'Failed to fetch the video info: ' + (target instanceof URL ? target.href : target);
    log.error(msg);
    throw new TypeError(msg);
  }
  const [, videoId] = extractAndValidateURL(target);
  const videoId_C = style('BM', videoId);

  logLine();

  if (isNullish(session)) {
    session = getGlob('innertube_session', session) || (globalInnertubeSession ?? null);
    if (session) log.debug('Using global Innertube session.');
  }
  const thisSession = session as Innertube;
  if (thisSession.session.player) {
    log.info(`Using player with ID: ${style('Y', thisSession.session.player.player_id)}`);
  }

  const selectedFormat = selectFormat(videoInfo, options, log);
  const range = {
    start: options?.range?.start ?? 0,
    end: options?.range?.end ?? selectedFormat?.content_length as number,
  };

  if (isNullish(selectedFormat)) {
    const msg = `Failed to select a format: ${(target instanceof URL
      ? target.href : target)}. No such format available: ${options.formatOptions}`;
    log.error(msg);
    // TODO: Add a better error type
    throw new TypeError(msg);
  }

  logFormatInfo(selectedFormat, videoInfo, log);

  const filename = parseOutFile(options.outFile ?? defaults.DownloadOptions.outFile, {
    title: videoInfo?.title ?? '<unknown>',
    author: videoInfo?.author.name?.replace(/\s-\sTopic$/, '') ?? '',
    url: videoInfo?.videoUrl as string,
    id: videoInfo?.videoId as string,
    ext: getExtensionFromMime(selectedFormat?.mime_type as string).replace('.', '')
  });

  // TODO: Add support for initiating abort controller from outside function
  const controller = new AbortController();
  const outputFile = await handleDownload(
    thisSession, videoId, range, outDir, filename,
    downloadHandler, videoInfo, selectedFormat, log, controller, maxRetries
  );

  logDownloadSummary(videoId_C, videoInfo, outputFile, log, logLine);

  const conversionResult = await handleAudioConversion(outputFile, options, log);

  return createDownloadResult({
    finalPath: (options?.convertAudio ? (conversionResult?.output.path ?? outputFile) : outputFile) as string,
    vInfo: videoInfo as VideoInfo,
    acInfo: isNullish(conversionResult) ? null : {
      inputFile: conversionResult.input.path,
      inputFfprobeData: conversionResult.input.metadata as FfprobeData,
      inputFileDeleted: conversionResult.input.deleted,
      outputFile: conversionResult.output.path,
      outputFfprobeData: conversionResult.output.metadata as FfprobeData
    },
    cache: {
      useCache: !!options?.useCache,
      innertubeCachePath: options?.useCache ? session?.session.cache?.cache_dir : undefined,
      vInfoCachePath: options?.useCache ? defaultVInfoCache.cacheDir : undefined
    }
  });
}


download('https://www.youtube.com/watch?v=Soy4jGPHr3g', {
  quiet: false,
  debug: true,
  maxRetries: 0,
  useCache: false,
  outDir: 'tmp/downloads',
  noInternetCheck: false,
  innerTubeConfig: {
    cookie: process.env.YT_COOKIES,
  }
}).then(console.log);
