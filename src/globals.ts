/**
 * @module   globals
 * @author   Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license  MIT
 * @since    5.0.0
 */

import type { Innertube, SessionOptions } from 'youtubei.js';
import type { NoParamFunction, NoParamAsyncFunction } from '#/utils/index.js';
import type { ResolvedYTMP3Config } from '#/core/config.js';
import type { LogLevel, Logger } from '#utils/log/logger.js';

/**
 * A unique `Symbol` used to namespace all internal global state.
 * Ensures non-conflicting access to environment state across modules.
 * 
 * @public
 * @since 5.0.0
 */
export const YTMP3_SYMBOL = Symbol.for('ytmp3-js');

/**
 * Maximum retries when failed to download the video info and audio content.
 *
 * @public
 * @since 5.0.0
 */
export const MAX_RETRIES = 3;

/**
 * An array containing all known configuration file's extension names.
 *
 * @internal
 * @since    1.0.0
 */
export const KNOWN_CONFIG_EXTS = [ '.config.js', '.config.mjs', '.config.cjs', '.json' ] as const;

/**
 * An array containing all known configuration options.
 *
 * @internal
 * @since    1.0.0
 */
export const KNOWN_OPTIONS = [ 'downloadOptions', 'audioConverterOptions', 'innertubeConfig', 'developer_options' ] as const;

/**
 * An immutable map of prioritized config file names used for runtime resolution.
 *
 * The keys are ordered priority identifiers (e.g., "#1", "#2"), and the values
 * are corresponding config file names.
 *
 * @remarks
 * It is hardcoded to be immutable. The mutator methods (`set`, `delete`, and `clear`) are
 * overridden to prevent any modification after initialization.
 *
 * @internal
 * @since    2.0.0
 */
export const PRIORITIZED_CONFIG_FILES = new Map([
  ['#1', 'ytmp3-js.config.cjs'],
  ['#2', 'ytmp3-js.config.mjs'],
  ['#3', 'ytmp3-js.config.js'],
  ['#4', 'ytmp3-js.json']
]);
// Mutate the PRIORITIZED_CONFIG_FILES to be immutable
Object.defineProperties(PRIORITIZED_CONFIG_FILES, {
  set: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    value: function set(_key: string, _val: string) { /* empty */ },
    writable: false,
    enumerable: false,
    configurable: false,
  },
  delete: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    value: function del(_key: string) { /* empty */ },
    writable: false,
    enumerable: false,
    configurable: false,
  },
  clear: {
    value: function clear() { /* empty */ },
    writable: false,
    enumerable: false,
    configurable: false,
  }
});

export interface YTMP3Env {
  // YTMP3
  YTMP3__DEBUG?: boolean;
  YTMP3__NO_COLOR?: boolean;
  YTMP3__LOG_LEVEL?: YTMP3GlobalState["logLevel"];
  YTMP3__LOG_FILE?: YTMP3GlobalState["logFile"];

  // FFmpeg
  FFMPEG_PATH?: string;
  FFPROBE_PATH?: string;

  // Node.js
  NODE_ENV?: string;
  NODE_OPTIONS?: string;

  // Others
  NO_COLOR?: boolean;
  HTTP_PROXY?: string;
  HTTPS_PROXY?: string;
  SOCKS_PROXY?: string;
  NO_PROXY?: string;
}

/**
 * An interface representing the global state of the application.
 * 
 * @public
 * @since 5.0.0
 */
export interface YTMP3GlobalState {
  /** Indicates that setup has completed and CLI application is in ready state */
  ready?: boolean;
  /** Indicates that the application has been interrupted by user */
  interrupted?: boolean;
  /**
   * Maximum retries when failed to download the video info and audio content.  
   * Defaults to {@linkcode MAX_RETRIES}.
   */
  maxRetries?: number,
  /** The logger instance used by the application */
  logger?: Logger;
  /** The log level used by the application, equivalent to {@linkcode Logger.levelStr | logger.levelStr} */
  logLevel?: keyof typeof LogLevel;
  /** The log file used by the application (if present) */
  logFile?: string | PromiseLike<string>;
  /** Indicates the device has installed the FFmpeg binaries */
  hasFfmpeg?: boolean;
  /** FFmpeg binary path and version */
  ffmpeg?: {
    /** FFmpeg binary path */
    path: string;
    /** FFmpeg version */
    version: string;
  },
  /** FFprobe binary path and version */
  ffprobe?: {
    /** Ffprobe binary path */
    path: string;
    /** Ffprobe version */
    version: string;
  },
  /** Indicates the device has internet connectivity (does not guarantee it has full internet access) */
  hasConnectivity?: boolean | PromiseLike<boolean>;
  /** Indicates that no color output is desired */
  noColor?: boolean;
  /** The environment variables */
  env?: YTMP3Env;
  /** The Innertube session used by the application */
  innertube_session?: Innertube;

  /**
   * The setup status of the application.
   * @private
   */
  __setup?: {
    metadata: boolean,
    log: boolean,
    ffmpeg: boolean,
    globalEnv: boolean,
    connectivity: boolean,
    argparser: boolean,
    config: boolean,
    innertubeSession: boolean,
  },
  /**
   * The parsed configuration.
   * @private
   */
  __parsedConfig?: ResolvedYTMP3Config;
  /**
   * The global Innertube configuration.
   * @private
   */
  __globalInnertubeConfig?: SessionOptions;
  /**
   * A list of hooks to be called when the application exits.
   * @private
   */
  __onExit?: (NoParamFunction<void> | NoParamAsyncFunction<void>)[];
  /**
   * The metadata of the project.
   * @private
   */
  "$__metadata__$"?: Readonly<ProjectMetadata>;
}

/**
 * An interface representing the metadata of the project.
 * @private
 */
export interface ProjectMetadata {
  name: string;
  title: string;
  description: string;
  scriptName: "ytmp3";
  author: {
    name: string;
    email: string | null;
    url: string | null;
  };
  version: {
    major: number;
    minor: number;
    patch: number;
    preRelease: "stable" | "beta" | "dev";
  };
  versionStr: string;
  copyright: string;
  homepageUrl: string;
  repository: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

/**
 * Type alias for `globalThis` object with YTMP3 global state.
 *
 * @remarks
 * This allows us to access the global state using type casting and without polluting the global object.
 *
 * @public
 * @since 5.0.0
 */
export type Global = typeof globalThis & {
  [YTMP3_SYMBOL]?: YTMP3GlobalState;
}
