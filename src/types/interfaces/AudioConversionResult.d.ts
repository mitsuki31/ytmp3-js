/**
 * @module    types/interfaces/AudioConversionResult
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
  input: {
    path: string;
    name: string;
    metadata?: FfprobeData;
  }
  output: {
    path: string;
    name: string;
    metadata?: FfprobeData;
  }
}
