/**
 * @module    core/internal/dlResult
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import path from 'node:path';
import type { FfprobeData } from 'fluent-ffmpeg';
import type DownloadResult from './interfaces/DownloadResult';
import type VideoInfo from './classes/VideoInfo';

/**
 * Creates a download result object.
 *
 * @param opts - The options object contaning the final path,
 *               video information, audio conversion information,
 *               and cache information.
 * @returns A download result object.
 *
 * @internal
 * @since    5.0.0
 */
export function createDownloadResult({ finalPath, vInfo, acInfo, cache }: {
  finalPath: string;
  vInfo: VideoInfo;
  acInfo: {
    inputFile: string;
    inputFfprobeData: FfprobeData;
    outputFile: string;
    outputFfprobeData: FfprobeData;
  } | null;
  cache: {
    useCache: boolean;
    vInfoCachePath?: string;
    innertubeCachePath?: string;
  };
}): Required<DownloadResult> {
  const useCache = Boolean(cache?.useCache);

  return {
    path: finalPath,
    outputFile: finalPath,
    url: vInfo.videoUrl,
    cache: {
      useCache: useCache,
      id: useCache ? vInfo.videoId : undefined,
      path: useCache ? cache?.vInfoCachePath : undefined,
      innertubeCache: (useCache && cache?.innertubeCachePath) ? {
        path: cache.innertubeCachePath
      } : undefined
    },
    metadata: { ...vInfo },  // Remember that `VideoInfo` implements `VideoMetadata`
    conversionResult: acInfo === null ? null : {
      input: {
        path: acInfo.inputFile,
        name: path.basename(acInfo.inputFile),
        metadata: acInfo.inputFfprobeData
      },
      output: {
        path: acInfo.outputFile,
        name: path.basename(acInfo.outputFile),
        metadata: acInfo.outputFfprobeData
      }
    }
  };
}
