/**
 * @module    core/internal/interfaces/options/AudioConverterOptions
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import type { FfmpegCommandOptions } from 'fluent-ffmpeg';
import type { DeveloperOptions } from './DeveloperOptions.js';

/**
 * An interface for audio conversion options.
 *
 * @public
 * @since 5.0.0
 */
export interface AudioConverterOptions extends Omit<
  FfmpegCommandOptions,
  // TODO: Add presets support
  "logger" | "cwd" | "source"| "preset" | "presets"
>, DeveloperOptions {
  /**
   * The FFmpeg options for input audio during audio conversion.
   *
   * @default []
   */
  inputOptions?: string[];
  /**
   * The FFmpeg options for output audio during audio conversion.
   *
   * @default []
   */
  outputOptions?: string[];
  /**
   * The desired output format (e.g., `'mp3'`, `'opus'`).
   *
   * If left unspecified, it will automatically detects format from specified codec.
   *
   * @default undefined
   */
  format?: string;
  /**
   * The audio bitrate (e.g., `'128k'`), it may be a number
   * or a string with an optional `k` suffix.
   *
   * @default "128k"
   */
  bitrate?: string | number;  // e.g., '128k' or 128
  /**
   * The audio sampling frequency in Hertz (e.g., `44100`).
   *
   * @remarks
   * If used format is `mp3`, the maximum value is `96000` (96khz)
   * and so on for other formats.
   *
   * @default 48000
   */
  frequency?: number;
  /**
   * The audio codec to use (e.g., `'libmp3lame'`).
   *
   * @default "libmp3lame"
   */
  codec?: string;
  /**
   * The number of audio channels (`2` for stereo and `1` for mono).
   *
   * @default 2
   */
  channels?: 1 | 2;
  /**
   * Whether to delete the original file after conversion.
   *
   * @default false
   */
  deleteOld?: boolean;
  /**
   * Whether to suppress the conversion progress except the error.
   *
   * For CLI application usage, this option will automatically
   * set to `false` as default.
   *
   * @default true
   */
  quiet?: boolean;
}
