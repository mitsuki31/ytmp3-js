/**
 * @module    types/interfaces/DownloadResult
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import type AudioConversionResult from './AudioConversionResult';
import type VideoMetadata from './VideoMetadata';

/**
 * Represents the result of the download process.
 * @public
 */
export default interface DownloadResult {
  /** Path to the downloaded file */
  path: string;
  /** Alias for {@linkcode path} */
  outputFile: string;
  /** URL of the video */
  url: string;
  /** Local stored cache information */
  cache: {
    /** Represents the current video information has been cached */
    useCache: boolean;
    /** A unique cache ID (similar to video ID), or `undefined` if not cached */
    id?: string;
    /** Cache path, or `undefined` if not cached */
    path?: string;
    /** Represents the Innertube cache information */
    innertubeCache?: {
      /** Path to the Innertube cache */
      path: string;
    };
  };
  /** Metadata of the video */
  metadata: VideoMetadata;
  /**
   * Result of the audio conversion process, or `null` if audio conversion is disabled.
   */
  conversionResult: AudioConversionResult | null;
}
