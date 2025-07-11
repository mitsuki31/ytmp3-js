export * from '#/core/ytmp3.js';
export * as FFmpeg from '#/core/ffmpeg-cmdp.js';
export { default as FluentFFmpeg, type FfmpegCommandLogger, type FfmpegCommandOptions } from 'fluent-ffmpeg';

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
