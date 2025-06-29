/**
 * @module    types/interfaces/YTMP3Config
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import type { SessionOptions } from 'youtubei.js';
import type { AudioConverterOptions, DeveloperOptions, DownloadOptions } from '#/types/ytmp3';

/**
 * An interface represents the **YTMP3-JS** configuration object which contains options to configure
 * both YouTube session, content download, and audio conversion process.
 *
 * @remarks This configuration often used for CLI application usage.
 *
 * @public
 * @since  1.0.0
 */
export interface YTMP3Config {
  /**
   * Options related to the download process.
   */
  downloadOptions: DownloadOptions;
  /**
   * Options related to the audio conversion process.
   *
   * This configuration extends to the `FfmpegCommandOptions` interface,
   * which allow to configure the FFmpeg behavior during audio conversion.
   *
   * @remarks
   * This property will be ignored if the `downloadOptions.converterOptions`
   * property are defined and is non-nullish.
   *
   * @see {@link https://github.com/fluent-ffmpeg/node-fluent-ffmpeg#creating-an-ffmpeg-command | `fluent-ffmpeg`: Creating an FFmpeg Command}
   */
  audioConverterOptions?: AudioConverterOptions;
  /**
   * Innertube configuration options.
   *
   * This configuration will be used to create the Innertube session
   * for YouTube-related operations.
   *
   * @see {@link https://ytjs.dev/guide/getting-started.html#configuration-options | YouTube.js: Configuration Options}
   */
  innertubeConfig?: SessionOptions;
  /**
   * Developer options.
   * This is reserved for YTMP3-JS developers and debugging purposes.
   */
  developer_options?: DeveloperOptions;
}
