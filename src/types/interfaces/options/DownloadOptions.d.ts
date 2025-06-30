/**
 * @module    types/interfaces/options/DownloadOptions
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import type { Types } from 'youtubei.js';
import type { Logger } from '#utils/log';
import type { ClientOptions } from './ClientOptions';
import type { DeveloperOptions } from './DeveloperOptions';
import type { GetInfoOptions } from './GetInfoOptions';
import type VideoInfo from '#/core/internal/classes/VideoInfo';

/** Represents the download options from `youtubei.js` with only necessary properties */
export type YTJS_DownloadOptions = Omit<Types.DownloadOptions, keyof Types.FormatOptions>;

/**
 * A function type for handling the actual download stream.
 * Custom handlers must conform to this signature.
 *
 * @returns The path to the downloaded file.
 *
 * @public
 * @since 5.0.0
 */
export type DownloadHandlerFunction = (
  /**
   * The readable stream (e.g., from a network request) to read data from.
   */
  stream: ReadableStream<Uint8Array>,
  /**
   * The video information object.
   */
  info: VideoInfo,
  /**
   * Options for the download handler, typically passed from core functions.
   */
  options: {
    /**
     * The output directory where the file will be saved.
     * Referenced from `outDir` in {@linkcode DownloadOptions}.
     */
    outDir: string;
    /**
     * The parsed filename for the downloaded file. This is generated from the
     * given template `outFile` in {@linkcode DownloadOptions}.
     */
    filename: string;
    /**
     * The selected format object containing details like `content_length`.
     */
    selectedFormat: ReturnType<VideoInfo["full"]["chooseFormat"]>
    /**
     * If `true`, suppresses all informational (non-error) output to the console, including progress updates.
     */
    quiet: boolean;
    /**
     * The logger instance to use for output. If `quiet` is set to `true` when calling core function,
     * the `NoneLogger` will be used instead.
     */
    logger: Logger;
    /**
     * An {@linkcode AbortSignal} that can be used to cancel the download operation.
     */
    signal?: AbortSignal | null | undefined;
  }
) => Promise<string>;

/**
 * An interface for download options.
 * @public
 * @since 5.0.0
 */
export interface DownloadOptions extends ClientOptions, GetInfoOptions, YTJS_DownloadOptions, DeveloperOptions {
  /**
   * The current working directory.
   *
   * @default "."
   */
  cwd?: string;
  /**
   * The output directory for downloaded audio contents.
   * The path is relative to {@linkcode cwd} property.
   *
   * @default "."
   */
  outDir?: string;
  /**
   * The custom output file name for the downloaded audio.
   *
   * @default "%(title)s.%(ext)s"
   */
  outFile?: string;
  /**
   * Whether to enable audio conversion behavior.
   *
   * @remarks
   * This option requires the {@link https://ffmpeg.org/ | FFmpeg} library to be installed on the system.
   *
   * @default false
   */
  convertAudio?: boolean;
  /**
   * The function to handle the download stream overriding the default handler.
   *
   * If left unspecified, it will defaults to the default handler.
   *
   * @default undefined
   */
  handler?: DownloadHandlerFunction | null;
  /**
   * The format options used to filter the selected audio format.
   *
   * Examples of format options:
   * ```js
   * {
   *   quality: "1080p",
   *   type: "video+audio"
   * }
   * ```
   *
   * ```js
   * { itag: "251" }
   * ```
   */
  formatOptions?: Types.FormatOptions;
  /**
   * Whether to disable non-error logging.
   *
   * For CLI application usage, this option will automatically
   * set to `false` as default.
   *
   * @default true
   */
  quiet?: boolean;
}
