// Core
export * from '#/core/ytmp3';
// Core (FFmpeg)
export { default as FluentFfmpeg, type FfmpegCommandLogger, type FfmpegCommandOptions } from 'fluent-ffmpeg';
import * as ffmpegCmdp from '#/core/ffmpeg-cmdp';
import * as audioconv from '#/core/audioconv';
export const Ffmpeg = {
  ...audioconv,
  ...ffmpegCmdp
};
// Cache
import type { Types } from 'youtubei.js';
/** Re-exported from `youtubei.js` */
export type ICache = Types.ICache;
export { UniversalCache } from 'youtubei.js';

// Interfaces
export type { default as AudioConversionResult } from '#/core/internal/interfaces/AudioConversionResult';
export type { default as AuthorInfo } from '#/core/internal/interfaces/AuthorInfo';
export type { default as DownloadResult } from '#/core/internal/interfaces/DownloadResult';
export type { default as Thumbnail } from '#/core/internal/interfaces/Thumbnail';
export type { default as VideoMetadata } from '#/core/internal/interfaces/VideoMetadata';
export type { YTMP3Config } from '#/core/internal/interfaces/YTMP3Config';

export type * from '#/core/internal/interfaces/options'

// Defaults
export { defaults } from '#utils/options';

// Errors
export {
  ArgumentParserError,
  CacheValidationError,
  ConfigParserError,
  DNSLookupTimeoutError,
  GlobalConfigParserError,
  IDExtractorError,
  IDValidationError,
  InvalidTypeError,
  URLValidationError,
  UnknownOptionError,
  UnknownYouTubeDomainError
} from '#error';
