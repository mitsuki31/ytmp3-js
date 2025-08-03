/**
 * @module    core/internal/interfaces/AudioConversionResult
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import type { FfprobeData } from 'fluent-ffmpeg';

/**
 * Represents the result of audio conversion.
 * @public
 */
export default interface AudioConversionResult {
  /** The input file information. */
  input: {
    /** The path to the input audio file. */
    path: string;
    /** The basename of the input audio file. */
    name: string;
    /** Metadata of the input audio file, if available. Retrieved using FFprobe. */
    metadata?: FfprobeData;
    /** Indicates if the input file was deleted after conversion. */
    deleted: boolean;
  }
  /** The output file information. */
  output: {
    /** The path to the output audio file. */
    path: string;
    /** The basename of the output audio file. */
    name: string;
    /** Metadata of the output audio file, if available. Retrieved using FFprobe. */
    metadata?: FfprobeData;
  }
}
