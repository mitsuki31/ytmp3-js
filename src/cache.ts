/**
 * This module provides caching functionalities for YouTube video information.
 *
 * It includes classes and methods to encode, decode, compress, and decompress
 * video information, as well as to create, check, and retrieve cached data.
 *
 * @module    cache
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { type Actions, type ApiResponse, Parser, type Types, YT } from 'youtubei.js';

import { InvalidTypeError, IDValidationError } from '#error';
import { getGlob, isDebugMode } from '#runtime/env';
import { TypeUtils } from '#/vendor/type-utils'
import { style as $c } from '#/vendor/colors'
import { URLUtils } from '#utils/url-utils'
import { captureStderrSync, logError, prettyPrintParserError } from '#utils/diag';
import { DefaultLogger, type Logger, createLogger } from '#utils/log';
import { generateRandomString, YTMP3_VINFO_CACHEDIR } from '#/utils';
import VideoInfo from './core/internal/classes/VideoInfo';
import type { GetCacheOptions, SetCacheOptions } from './types/cache';
import { defaults } from './utils/options';

const logger = getGlob('logger', DefaultLogger) as Logger;

export type CacheData = {} & {
  videoId: string;
  responses: [ApiResponse, ApiResponse?],  // [Endpoint<'/player'>, Endpoint<'/next'>]
  cpn?: string;
  timestamp: Date;
  expires: Date;
};

/**
 * Represents a serialized {@link VideoInfo} object.
 *
 * @remarks
 * This object is used to store a {@link VideoInfo} object in the cache.
 * It contains the video ID and the languages with their respective cache data.
 *
 * @internal
 * @since 5.0.0
 */
export interface SerializedVideoInfo {
  /**
   * The unique YouTube video ID.
   */
  videoId: string;

  /**
   * The languages with their respective cache data.
   *
   * @remarks
   * The language code is used as the key and the value is the cache data object.
   * The cache data object contains the video ID, the API responses, and the
   * CPN (Content Protection Network) value.
   *
   * Whenever the user change the language, the cache data will be refreshed
   * and updated with the new language. This behavior cannot be prevented,
   * and if we look into the Innertube behavior itself, it will always re-fetch the
   * video information for the selected language.
   */
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
  lang: {
    [langCode: string]: CacheData
  };
}


/**
 * Validates YouTube video ID before cache creation and throws
 * an error if the video ID is not valid.
 *
 * @param id - The YouTube video ID to validate.
 *
 * @throws {@link InvalidTypeError} If the given ID is not a string.
 * @throws {@link IDValidationError} If the given ID is not a valid YouTube video ID.
 *
 * @private
 * @since   5.0.0
 */
function validateId(id: string): void {
  if (typeof id !== 'string') {
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
 * Compresses a JavaScript object into a `Buffer` using `zlib` gzip and with best compression.
 *
 * @typeParam T - The type of the object to be compressed.
 * @param obj - The object to be compressed.
 * @returns A promise that resolves with the compressed data as a `Buffer`.
 *
 * @throws {Error} If there is an error during compression.
 *
 * @internal
 * @since 5.0.0
 */
export async function compressObj<T = Record<string, unknown>>(obj: T): Promise<Buffer<ArrayBuffer>> {
  return await new Promise((resolve, reject) => {
    zlib.gzip(JSON.stringify(obj), {
      level: zlib.constants?.Z_BEST_COMPRESSION  // Use maximum compression
    }, (err, result) => err ? reject(err) : resolve(result));
  });
}

/**
 * Decompresses a JavaScript object from a deflated `Buffer` using `zlib` gunzip.
 *
 * @typeParam T - The type of the object to be decompressed, cast manually when needed.
 * @param deflated - The deflated Buffer to decompress.
 * @returns The decompressed JavaScript object.
 *
 * @throws {Error} If there is an error during decompression.
 *
 * @internal
 * @since 5.0.0
 */
export async function decompressObj<T = unknown>(deflated: Buffer): Promise<T> {
  const buffer = await new Promise<Buffer<ArrayBuffer>>((resolve, reject) => {
    zlib.gunzip(deflated, (err, result) => err ? reject(err) : resolve(result));
  });
  return JSON.parse(buffer.toString());
}


/**
 * Manages caching of YouTube video information.
 *
 * This class handles the caching of video information for specific YouTube video IDs.
 * The cache is stored on disk in a compressed format using `zlib` gzip and is
 * automatically created if it does not exist.
 *
 * The cache is stored in a directory specified by the `cacheDir` parameter of the
 * constructor. The cache directory is created automatically if it does not exist.
 * The cache file for a given video ID is stored in this directory with the same name
 * as the video ID.
 *
 * The cache is refreshed automatically if it is expired or if the `force` option is
 * specified when calling the {@link VInfoCache#set | set} method. Unless the `autoFetch`
 * option is set to `false` when attempting to get the cache.
 *
 * @internal
 * @since 5.0.0
 */
export class VInfoCache {
  private __cacheDir: string;
  private log: Logger;

  /**
   * Creates a new video info cache using the given directory.
   * The directory is created automatically if it does not exist.
   *
   * @remarks The cache directory creation is run synchronously.
   *
   * @param cacheDir - Absolute or relative path to the cache directory.
   *
   * @internal
   */
  constructor(cacheDir = YTMP3_VINFO_CACHEDIR, { debug }: { debug?: boolean } = {}) {
    this.__cacheDir = cacheDir;

    if (!fs.existsSync(this.__cacheDir)) {
      fs.mkdirSync(this.__cacheDir, { recursive: true });
    }
    // Automatically set to debug mode if global debug mode is set
    if (typeof debug === 'undefined') debug = isDebugMode();
    this.log = debug ? createLogger('DEBUG') : logger;
  }

  /**
   * Generates the cache path for a given video ID.
   *
   * The cache path is generated by joining the current used cache directory path
   * with the provided video ID.
   *
   * @param id - The unique identifier for the cache entry.
   * @returns The absolute path to the cache file.
   *
   * @private
   * @see      {@link YTMP3_VINFO_CACHEDIR}
   */
  private getCachePath(videoId: string): string {
    return path.join(this.__cacheDir, videoId);
  }

  /**
   * Checks if a given `VideoInfo` object is considered expired.
   * This is typically based on the `info.streaming_data.expires`.
   *
   * @param data - The `VideoInfo` object to validate.
   * @returns `true` if the cache is expired and should be re-fetched.
   *
   * @private
   */
  private isExpired(data: CacheData): boolean {
    if (!data.expires) return true;  // No expiry set, treat as expired
    const expireTime = new Date(data.expires).getTime();
    return Date.now() >= expireTime;
  }

  /**
   * Gets the current used cache directory.
   *
   * @internal
   */
  public get cacheDir(): string {
    return this.__cacheDir;
  }

  /**
   * Serializes a `VideoInfo` instance into a plain object suitable for caching.
   *
   * This function extracts the internal raw API responses and CPN needed to reconstruct
   * the original `VideoInfo` later.
   *
   * @param info - The `VideoInfo` instance to serialize.
   * @returns The serializable representation for cache storage.
   *
   * @internal
   */
  public static async serialize(info: YT.VideoInfo, client?: Types.InnerTubeClient): Promise<SerializedVideoInfo> {
    const videoId = (info.basic_info.id ?? info.page[0].video_details?.id) as string;
    const payload = {
      videoId,
      racyCheckOk: true,
      contentCheckOk: true
    };
    const langCode = info.actions.session.context.client.hl ?? info.actions.session.lang;

    const extraPayload = {
      playbackContext: {
        contentPlaybackContext: {
          vis: 0,
          splay: false,
          lactMilliseconds: '-1',
          signatureTimestamp: info.actions.session.player?.sts
        }
      },
      client: client ?? defaults.InnerTubeConfig.client_type
    };
    if (info.actions.session.po_token) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (extraPayload as any).serviceIntegrityDimensions = {
        poToken: info.actions.session.po_token
      };
    }

    const rawResponses = await Promise.all([
      info.actions.execute('/player', { parse: false, ...payload, ...extraPayload }),
      info.actions.execute('/next', { parse: false, ...payload, ...extraPayload }),
    ]);

    const serialized: SerializedVideoInfo = {
      videoId,
      lang: {
        [langCode]: {
          videoId,
          responses: rawResponses,
          cpn: info.cpn,
          timestamp: new Date(),
          expires: info.streaming_data?.expires as Date,
        }
      }
    };

    return serialized;
  }

  /**
   * Retrieves a cached video info from disk.
   *
   * If the cache file exists and is not expired, returns the parsed `VideoInfo`.
   * If the cache is invalid, expired, or unreadable, returns `null`.
   *
   * This method automatically decompresses the cache if stored as gzipped binary.
   *
   * @param videoId - The YouTube video ID to look up.
   * @returns The cached `VideoInfo` object, or `null` if not found or expired.
   *
   * @internal
   */
  public async get(videoId: string, actions: Actions, options: GetCacheOptions & { rawCache: true }): Promise<SerializedVideoInfo | null>;
  public async get(videoId: string, actions: Actions, options?: GetCacheOptions & { rawCache?: boolean }): Promise<VideoInfo | null>;
  public async get(videoId: string, actions: Actions, options?: GetCacheOptions): Promise<VideoInfo | SerializedVideoInfo | null> {
    validateId(videoId);
    const cachePath = this.getCachePath(videoId);
    const langCode = actions.session?.context?.client?.hl || actions.session.lang;

    options = {
      autoFetch: true,
      rawCache: false,
      signal: undefined,
      ...(options ?? {})
    };

    let cachedRawData: SerializedVideoInfo | null = null; // Will hold the successfully loaded and validated cache
    let chosenCachedRawData: CacheData | null = null;

    try {
      const raw = await fs.promises.readFile(cachePath, { signal: options?.signal });
      this.log.debug(`Attempting to read cache for ID ${videoId}`);

      let parsedData: SerializedVideoInfo | undefined = undefined;
      try {
        parsedData = JSON.parse(raw.toString('utf-8'));
      } catch {
        this.log.debug(`JSON parse failed, trying compressed cache for ID ${videoId}`);
        // If direct parse fails, try decompressing
        parsedData = await decompressObj<SerializedVideoInfo>(raw);
      }
      if (options.rawCache) return parsedData ?? null;

      cachedRawData = parsedData as SerializedVideoInfo;
      chosenCachedRawData = cachedRawData.lang[langCode];

      if (chosenCachedRawData && !this.isExpired(chosenCachedRawData)) {
        this.log.debug(`Cache hit and valid for ID ${videoId} [lang_code: ${langCode}]`);
        cachedRawData.lang[langCode] = chosenCachedRawData;
      } else {
        if (parsedData) {
          this.log.debug(`Cache expired for ID ${videoId}.${
            options?.autoFetch ? ' Re-fetching...' : ''}`);
        } else {
          this.log.debug(`Cache miss for ID ${videoId}.`);
        }

        // Cache expired or parsing failed, remove the affected language only
        const filteredRawData = { ...(parsedData ?? {}) };
        delete filteredRawData.lang?.[langCode];
        cachedRawData = { ...(filteredRawData as SerializedVideoInfo) }  // Copy the filtered object
      }
    } catch (err) {
      // Treat file not found or abort errors as a cache miss
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT' && (err as Error).name !== 'AbortError') {
        logError(`Failed to read/parse cache for ID ${$c('Y', videoId)}`, err as Error, this.log);
        if (isDebugMode()) console.error(err);
      }
      this.log.debug(`Cache miss or read error for ID ${videoId}. Proceeding to fetch if no valid cache.`);
    }

    // --- FETCH FROM NETWORK ONLY IF NO VALID CACHE ---
    let finalResponses = [] as [ApiResponse?, ApiResponse?];
    let cpnToUse: string;

    if (chosenCachedRawData) {
      this.log.debug(`Using cached data for ID ${videoId} [lang_code: ${langCode}]`);
      finalResponses = chosenCachedRawData.responses; // Use the raw responses from cache
      cpnToUse = chosenCachedRawData.cpn ?? generateRandomString(16);
    } else {
      // Return null early if `autoFetch` set to false
      if (!options?.autoFetch) return null;

      this.log.debug('Fetching fresh responses for ID', videoId, `[lang_code: ${langCode}]`);
      const payload = {
        videoId,
        racyCheckOk: true,
        contentCheckOk: true
      };

      const session = actions.session;
      if (!session) {
        this.log.error('Innertube session is not available in actions. Cannot fetch data.');
        return null;
      }

      const extraPayload = {
        playbackContext: {
          contentPlaybackContext: {
            vis: 0,
            splay: false,
            lactMilliseconds: '-1',
            signatureTimestamp: session.player?.sts
          }
        },
        client: defaults.InnerTubeConfig.client_type
      };
      if (session.po_token) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (extraPayload as any).serviceIntegrityDimensions = {
          poToken: session.po_token
        };
      }

      try {
        const [playerRaw, nextRaw] = await Promise.all([
          // IMPORTANT: The `actions.execute` should include the `video_id` in the payload for these specific endpoints.
          // Also, `extraPayload` should be merged carefully.
          actions.execute('/player', { ...payload, ...extraPayload, parse: false, signal: options?.signal }),
          actions.execute('/next', { ...payload, ...extraPayload, parse: false, signal: options?.signal }),
        ]);

        finalResponses = [playerRaw, nextRaw];
        cpnToUse = generateRandomString(16);  // New CPN for new session data
        const parsedResponse = Parser.parseResponse(playerRaw.data);

        // Prepare data for caching
        const newSerializedData: SerializedVideoInfo = {
          videoId,
          lang: {
            ...(cachedRawData?.lang ?? {}),
            [langCode]: {
              videoId,
              responses: finalResponses as [ApiResponse, ApiResponse],
              cpn: cpnToUse,
              timestamp: new Date(),
              expires: (parsedResponse.streaming_data?.expires) 
                ? parsedResponse.streaming_data.expires
                : new Date(Date.now() + 6 * 60 ** 2 * 1000)  // Default to 6 hours if not found
            }
          }
        };

        // Cache the newly fetched raw responses
        await this.set(newSerializedData, { force: true });  // Use the existing set method
      } catch (fetchErr) {
        logError(`Failed to fetch fresh responses for ID ${$c('Y', videoId)}`, fetchErr as Error, this.log);
        if (isDebugMode()) console.error(fetchErr);
        return null;  // Cannot get data
      }
    }

    // --- PARSE AND RETURN ---
    if (!finalResponses || finalResponses.length === 0) {
      this.log.error('No raw responses available after cache check and fetch.');
      return null;
    }

    let videoInfo: YT.VideoInfo | unknown = undefined;
    const parserError = captureStderrSync(() => {
      // YT.VideoInfo constructor likely expects the raw JSON objects from the API calls
      videoInfo = new YT.VideoInfo(finalResponses as [ApiResponse, ApiResponse], actions, cpnToUse);
    });
    prettyPrintParserError(parserError, this.log);

    // Optional: Check playability status from the player response if desired
    // This is part of the parsing, not the caching decision
    const playerParsed = Parser.parseResponse((finalResponses  as [ApiResponse, ApiResponse])[0]);
    if (playerParsed?.playability_status?.status && playerParsed.playability_status.status !== 'OK') {
      this.log.warn(`Video ${videoId} has playability status: ${
        playerParsed.playability_status.status
      }. Reason: ${playerParsed.playability_status.reason || 'N/A'}`);
    }

    return new VideoInfo(videoInfo as YT.VideoInfo, { videoId });
  }

  /**
   * Stores a serialized video info object to disk in compressed format.
   *
   * By default, this method skips writing if a valid cache file already exists.
   * Use `force: true` in `options` to override this behavior.
   *
   * @param info - The serialized `VideoInfo` object to store in the cache.
   * @param options - Optional write behavior:
   *
   * @internal
   */
  public async set(info: SerializedVideoInfo, options?: SetCacheOptions): Promise<void> {
    validateId(info.videoId);
    const cachePath = this.getCachePath(info.videoId);

    options = {
      force: false,
      noCompression: false,
      signal: undefined,
      ...(options ?? {})
    }

    if (!options?.force) {
      // This might be not strict because it does not check the cache content
      if (this.has(info.videoId)) {
        this.log.debug(`Cache for ID ${$c('Y', info.videoId)} already exists, skipping...`);
        return;
      }
    }

    // Check if CPN is left unspecified
    Object.keys(info.lang).forEach(langCode => {
      if (!info.lang[langCode].cpn) info.lang[langCode].cpn = generateRandomString(16);
    });

    try {
      if (options?.noCompression)
        this.log.debug('Skipping cache compression for ID', $c('Y', info.videoId));

      // Compress the video info object using gzip with best compression
      const compressedCache = options?.noCompression
        ? JSON.stringify(info)  // Skip compression
        : await compressObj(info);
      const stream = fs.createWriteStream(cachePath, {
        encoding: options?.noCompression ? 'utf-8' : undefined, signal: options?.signal
      });

      // Very stricter method to write and await the stream
      // This way we can prevent from any unexpected I/O errors
      await new Promise<void>((res, rej) => {
        stream.on('close', () => {
          this.log.debug(`Cache stream for ID ${$c('Y', info.videoId)} has been closed`);
          res();
        });
        stream.on('error', rej);
        stream.end(compressedCache, () =>
          this.log.debug(`Cache for ID ${$c('Y', info.videoId)} has successfully written!`));
      });
    } catch (err) {
      logError(`Failed to write cache for ID ${$c('Y', info.videoId)}:`, err as Error, this.log);
    }
  }

  /**
   * Check if a cache for the given video ID exists.
   *
   * This method returns a boolean indicating whether a cache for the given video
   * ID exists on disk. If the `async` option is set to `true`, this method returns
   * a promise that resolves with the same boolean value.
   *
   * @param videoId - The YouTube video ID to check.
   * @param async - Optional. If `true`, this method returns a promise. Defaults to `false`.
   *
   * @returns A boolean indicating whether a cache for the given video ID exists.
   *          If `async` is `true`, this method returns a promise that resolves with the same value.
   *
   * @internal
   */
  public has(videoId: string, async?: boolean): boolean;
  public has(videoId: string, async: true): Promise<boolean>;
  public has(videoId: string, async?: boolean): boolean | Promise<boolean> {
    validateId(videoId);
    const cache = this.getCachePath(videoId);
    if (async) {
      return fs.promises.access(cache, fs.constants.R_OK)
        .then(() => true).catch(() => false);
    } else {
      return fs.existsSync(cache);
    }
  }

  /**
   * Removes a cache for the given video ID.
   *
   * This method attempts to delete the cache file for the given video ID.
   * If the cache file does not exist, this method does not throw an error.
   * If the cache file exists but cannot be deleted, this method throws an error.
   *
   * @param videoId - The YouTube video ID to remove the cache for.
   * @returns A promise that resolves when the cache file has been deleted.
   *
   * @internal
   */
  public async remove(videoId: string): Promise<void> {
    validateId(videoId);
    const cache = this.getCachePath(videoId);
    try {
      await fs.promises.unlink(cache);
    } catch (err) {
      if (err instanceof Error && (err as NodeJS.ErrnoException).code !== 'ENOENT') {
        logError(`Failed to remove cache for ID ${$c('Y', videoId)}:`, err, this.log);
        throw err;
      }
    }
  }
}
