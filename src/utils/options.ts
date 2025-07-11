/**
 * This module provides functions to validate and resolve user input options.
 *
 * This module also provide the default options used by the application, they are defined in
 * the `defaults` namespace. Please note, all properties within the namespace are read-only properties.
 *
 * @module   utils/options
 * @author   Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license  MIT
 * @since    2.0.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Readable } from 'node:stream';
import { UniversalCache, ClientType, Innertube, type SessionOptions } from 'youtubei.js';
import type { FfmpegCommandLogger, FfmpegCommandOptions } from 'fluent-ffmpeg';

import type { ClientOptions, DownloadOptions, GetInfoOptions, DeveloperOptions, YTJS_DownloadOptions, AudioConverterOptions } from '#/core/internal/interfaces/options';
import type { AnyClass, AnyFunction, AnyPlainObject, DropNullAndUndefined } from '#/utils';
import { type Logger, DefaultLogger } from '#utils/log';
import { INNERTUBE_CACHEDIR } from '#/utils/constants';
import { getType, isCallable, isClass, isNullish, isPlainObject, isUndefined } from '#/vendor/type-utils';
import { InvalidTypeError } from '#error';
import { MAX_RETRIES } from '#globals';
import { defaultHandler } from '#/core/helpers/handler';

/**
 * Type represents the expected option type.
 * @internal
 * @since 5.0.0
 */
export type OptionTypeDefinition =
  | 'string' | 'number' | 'boolean' | 'array' | 'function' | 'object' | 'undefined' | typeof Readable | typeof Innertube
  | ('string' | 'number' | 'boolean' | 'array' | 'function' | 'object' | 'undefined' | typeof Readable | typeof Innertube)[];

/**
 * Type represents the default value of an option.
 * @internal
 * @since 5.0.0
 */
export type OptionDefaultValue =
  | string
  | number
  | boolean
  | any[] | Record<string, any> | AnyFunction | AnyClass;

/**
 * Type represents the configuration of expected option.
 * @internal
 * @since 5.0.0
 */
export type OptionConfig =
  | [OptionTypeDefinition, null]
  | [OptionTypeDefinition, (OptionDefaultValue | null)?]
  | [OptionTypeDefinition, (OptionDefaultValue[] | null)?]
  | [OptionTypeDefinition, (OptionDefaultValue | OptionDefaultValue[] | null)?];

// Declare here first, because it is referenced by `defaults.GetInfoOptions`
const DefaultInnerTubeConfig: SessionOptions = {
  // Use a cache (recommended)
  cache: new UniversalCache(true, INNERTUBE_CACHEDIR),
  enable_session_cache: true,  // Ensure session data is cached

  // General session settings
  lang: 'en',
  location: undefined,
  user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36', // Mimic a recent Chrome browser
  timezone: undefined, // Set timezone for relevant content

  // Client type settings
  device_category: 'desktop',   // Simulate a desktop browser
  client_type: ClientType.WEB,  // Simulate the main YouTube website client

  // Player and config settings
  retrieve_player: true,            // Absolutely necessary for deciphering video formats
  retrieve_innertube_config: true,  // Get full config for most operations

  // Login/personalization (if needed)
  cookie: undefined,          // Only if need to get age-restricted or protected contents
  account_index: 0,           // If has multiple accounts logged-in
  visitor_data: undefined,    // For non-logged-in personalization
  enable_safety_mode: false,  // Restrict any sensitive or unsafe content
  on_behalf_of_user: undefined,

  // Advanced options (usually leave default or for specific debugging)
  generate_session_locally: false,
  po_token: undefined,
  player_id: undefined,
  fetch: undefined,  // Use builtin fetch, if behind the proxy needs to be overriden
};

const DefaultClientOptions: Required<ClientOptions> = {
  maxRetries: MAX_RETRIES,
  session: null,  // Will be overriden with global session on CLI usage
  noInternetCheck: false,
  safeMode: false,
  useCache: true,
} as const;

const DefaultGetInfoOptions: Required<Omit<GetInfoOptions, keyof DeveloperOptions>> = {
  ...DefaultClientOptions,
  innerTubeConfig: DefaultInnerTubeConfig,
  quiet: true,
} as const;

const DefaultDownloadOptions: Required<
  Omit<DownloadOptions, keyof YTJS_DownloadOptions | keyof DeveloperOptions>
> & YTJS_DownloadOptions = {
  ...DefaultGetInfoOptions,
  cwd: '.',
  outDir: '.',
  outFile: '%(title)s.%(ext)s',
  convertAudio: false,
  handler: defaultHandler,
  safeMode: false,
  useCache: true,
  quiet: false,
  formatOptions: { itag: 140, type: 'audio', client: 'YTMUSIC' },  // Default audio format
  // -- youtube.js download options
  range: undefined
} as const;

const DefaultFfmpegCommandOptions: FfmpegCommandOptions & { logger?: FfmpegCommandLogger | Logger } = {
  logger: DefaultLogger,
  niceness: 10,
  priority: 10,  // Ignored on Windows platform
  timeout: 0,
  stdoutLines: 100,
} as const;

const DefaultAudioConverterOptions: Required<Omit<AudioConverterOptions, keyof DeveloperOptions>> = {
  ...(DefaultFfmpegCommandOptions as Required<typeof DefaultFfmpegCommandOptions>),
  inputOptions: [] as string[],
  outputOptions: [] as string[],
  format: 'mp3',
  codec: 'libmp3lame',
  bitrate: 128,
  frequency: 44100,
  channels: 2,
  deleteOld: false,
  quiet: true,
} as const;

/**
 * A namespace containing all default options used by the application.
 *
 * @public
 * @since  5.0.0
 */
export const defaults: {
  ClientOptions: Readonly<typeof DefaultClientOptions>,
  /**
   * Default options for `getInfo` function.
   */
  GetInfoOptions: Readonly<typeof DefaultGetInfoOptions>,
  /**
   * Default options for `download` function.
   */
  DownloadOptions: Readonly<typeof DefaultDownloadOptions>,
  /**
   * Default options for `convertAudio` function.
   */
  AudioConverterOptions: Readonly<typeof DefaultAudioConverterOptions>,
  /**
   * Default options for `ffmpegCommand` function.
   */
  FfmpegCommandOptions: Readonly<typeof DefaultFfmpegCommandOptions>,
  /**
   * Default config for `Innertube.create` function.
   */
  InnerTubeConfig: Readonly<SessionOptions>
} = {
  ClientOptions: DefaultClientOptions,
  GetInfoOptions: DefaultGetInfoOptions,
  DownloadOptions: DefaultDownloadOptions,
  AudioConverterOptions: DefaultAudioConverterOptions,
  FfmpegCommandOptions: DefaultFfmpegCommandOptions,
  InnerTubeConfig: DefaultInnerTubeConfig
};


// #region Option Metadata

export const _FFmpegCommandOptions: {
  [K in keyof FfmpegCommandOptions]: [OptionTypeDefinition, (typeof defaults.FfmpegCommandOptions)[K]];
} = {
  logger: [['object', 'function', 'undefined'], DefaultLogger],
  niceness: ['number', undefined],
  priority: ['number', undefined],
  presets: ['string', undefined],
  preset: ['string', undefined],
  stdoutLines: ['number', undefined],
  timeout: ['number', undefined],
  source: [['string', Readable, 'undefined'], undefined],
  cwd: ['string', undefined],
};

export const _GetInfoOptions: {
  [K in keyof GetInfoOptions]-?: [OptionTypeDefinition, Required<GetInfoOptions>[K]];
} = {
  useCache: ['boolean', defaults.GetInfoOptions.useCache],
  safeMode: ['boolean', defaults.GetInfoOptions.safeMode],
  quiet: ['boolean', defaults.GetInfoOptions.quiet],
  innerTubeConfig: ['object', defaults.GetInfoOptions.innerTubeConfig],
  // -- Client options
  maxRetries: ['number', defaults.GetInfoOptions.maxRetries],
  session: ['object', defaults.GetInfoOptions.session],
  noInternetCheck: ['boolean', defaults.GetInfoOptions.noInternetCheck],
  // -- Developer options
  debug: ['boolean', false]
};

export const _DownloadOptions: {
  [K in keyof DownloadOptions]-?: [OptionTypeDefinition, DownloadOptions[K]];
} = {
  cwd: ['string', defaults.DownloadOptions.cwd],
  outDir: ['string', defaults.DownloadOptions.outDir],
  outFile: [['string', 'undefined'], defaults.DownloadOptions.outFile],
  convertAudio: ['boolean', defaults.DownloadOptions.convertAudio],
  useCache: ['boolean', defaults.DownloadOptions.useCache],
  quiet: [['boolean', 'string'], defaults.DownloadOptions.quiet],
  handler: ['function', defaults.DownloadOptions.handler],
  formatOptions: [['object', 'undefined'], defaults.DownloadOptions.formatOptions],
  // -- Client options
  safeMode: ['boolean', defaults.DownloadOptions.safeMode],
  maxRetries: ['number', defaults.DownloadOptions.maxRetries],
  session: [Innertube, defaults.DownloadOptions.session],
  noInternetCheck: ['boolean', defaults.DownloadOptions.noInternetCheck],
  // -- Get info options
  innerTubeConfig: [['object', 'undefined'], defaults.DownloadOptions.innerTubeConfig],
  // -- youtube.js download options
  range: [['object', 'undefined'], undefined],
  // -- Developer options
  debug: [['boolean', 'undefined'], false]
};

export const _AudioConverterOptions: {
  [K in keyof AudioConverterOptions]-?: [OptionTypeDefinition, Required<AudioConverterOptions>[K]];
} = {
  inputOptions: [['array', 'string'], defaults.AudioConverterOptions.inputOptions],
  outputOptions: [['array', 'string'], defaults.AudioConverterOptions.outputOptions],
  format: ['string', defaults.AudioConverterOptions.format],
  codec: ['string', defaults.AudioConverterOptions.codec],
  bitrate: [['number', 'string'], defaults.AudioConverterOptions.bitrate],
  frequency: ['number', defaults.AudioConverterOptions.frequency],
  channels: ['number', defaults.AudioConverterOptions.channels],
  deleteOld: ['boolean', defaults.AudioConverterOptions.deleteOld],
  quiet: ['boolean', defaults.AudioConverterOptions.quiet],
  // -- FFmpeg command options
  niceness: ['number', defaults.AudioConverterOptions.niceness],
  priority: ['number', defaults.AudioConverterOptions.priority],
  timeout: ['number', defaults.AudioConverterOptions.timeout],
  stdoutLines: ['number', defaults.AudioConverterOptions.stdoutLines],
  // -- Developer options
  debug: ['boolean', false]
};

export const _InnerTubeConfig: {
  [K in keyof SessionOptions]-?: [OptionTypeDefinition, (typeof defaults.InnerTubeConfig)[K]];
} = {
  cache: ['boolean', defaults.InnerTubeConfig.cache],
  enable_session_cache: ['boolean', defaults.InnerTubeConfig.enable_session_cache],
  lang: ['string', defaults.InnerTubeConfig.lang],
  location: ['string', defaults.InnerTubeConfig.location],
  user_agent: ['string', defaults.InnerTubeConfig.user_agent],
  timezone: ['string', defaults.InnerTubeConfig.timezone],
  device_category: ['string', defaults.InnerTubeConfig.device_category],
  client_type: ['string', defaults.InnerTubeConfig.client_type],
  retrieve_player: ['boolean', defaults.InnerTubeConfig.retrieve_player],
  retrieve_innertube_config: ['boolean', defaults.InnerTubeConfig.retrieve_innertube_config],
  cookie: [['string', 'undefined'], defaults.InnerTubeConfig.cookie],
  account_index: ['number', defaults.InnerTubeConfig.account_index],
  visitor_data: ['string', defaults.InnerTubeConfig.visitor_data],
  enable_safety_mode: ['boolean', defaults.InnerTubeConfig.enable_safety_mode],
  on_behalf_of_user: ['string', defaults.InnerTubeConfig.on_behalf_of_user],
  generate_session_locally: ['boolean', defaults.InnerTubeConfig.generate_session_locally],
  po_token: ['string', defaults.InnerTubeConfig.po_token],
  player_id: ['string', defaults.InnerTubeConfig.player_id],
  fetch: [['function', 'undefined'], defaults.InnerTubeConfig.fetch],
};

export const AllSupportedOptions = Object
  .values(defaults)
  .reduce((acc, item) => {
    acc.push(...Object.keys(item) as typeof acc);
    return acc;
  }, [] as (keyof (DownloadOptions & AudioConverterOptions & GetInfoOptions))[]);


// #endregion Option Metadata

/**
 * Resolves and validates input options against expected types and default values.
 *
 * This function ensures that only recognized options with the correct types are retained.
 * If an option is missing or has an incorrect type, it is replaced with a default value (if specified).
 *
 * ### How It Works
 * - **Filters Out Unknown Options**: Only options defined in `expectedOpts` are included.
 * - **Validates Option Types**: Each option's type is checked against the expected type.
 * - **Supports Multiple Expected Types**: 
 *   - If an option accepts multiple types (e.g., `'string'` or `'number'`), 
 *     the function iterates through them and assigns the first valid type.
 * - **Handles Special Cases**:
 *   - `'array'` is explicitly checked using `Array.isArray()`.
 *   - `'function'` ensures that the value is callable but **not an ES6 class**.
 *   - If an **expected type is a class**, it checks if the value is an instance of that class.
 * - **Fallback to Default Values**: If an option is missing or invalid, the default value is used.
 *
 * @param inOpts - The input options to be resolved.
 * @param expectedOpts - An object defining expected types and default values. With the key being the
 *                       option name and the value being an array defining the expected type(s) and default value.
 * @param shouldThrow - Whether to throw {@link InvalidTypeError} if got any invalid type.
 * @param useDefault - Whether to fallback to the specified default value if got an invalid type.
 *                                      This parameter does not conflict with the `shouldThrow` parameter, if `shouldThrow`is enabled
 *                                      the parsed option will set to default value first and then throw the error.
 *
 * @returns An object containing only the valid and resolved options.
 *
 * @example <caption> Basic usage with primitive types </caption>
 * ```js
 * const options = resolve(
 *   { cacheSize: '10', verbose: true },
 *   { cacheSize: ['number', 5], verbose: ['boolean', false] }
 * );
 * console.log(options);  // { cacheSize: 5, verbose: true }
 * ```
 *
 * @example <caption> Handling multiple expected types </caption>
 * ```js
 * const options = resolve(
 *   { cacheSize: '10', mode: 'fast' },
 *   { cacheSize: [['number', 'string'], 5], mode: ['string', 'default'] }
 * );
 * console.log(options);  // { cacheSize: '10', mode: 'fast' }
 * ```
 *
 * @example <caption> Handling class instances </caption>
 * ```js
 * class CacheHandler {}
 * const options = resolve(
 *   { handler: new CacheHandler() },
 *   { handler: [CacheHandler, null] }
 * );
 * console.log(options);  // { handler: CacheHandler {} }
 * ```
 *
 * @example <caption> Handling invalid values </caption>
 * ```js
 * const options = resolve(
 *   { cacheSize: 'not a number' },
 *   { cacheSize: ['number', 10] }
 * );
 * console.log(options); // { cacheSize: 10 } // Falls back to default
 * ```
 *
 * @internal
 * @since    5.0.0
 */
export function resolve<T extends AnyPlainObject, U extends Record<NoInfer<keyof T>, OptionConfig>>(
  inOpts: T,
  expectedOpts: U,
  shouldThrow = false,
  useDefault = true
): Partial<{ [K in keyof T]: T[K] }> {
  function _throw(name: string, actual: unknown, expected: unknown) {
    if (!shouldThrow) return;  // Reject to throw if the `shouldThrow` is false
    const expectedType = typeof expected === 'string'
      ? expected
      : (Array.isArray(expected)
        ? [...expected].map(x => {
          x = (x === 'array') ? 'any[]' : x;
          return (typeof x === 'string') ? x : getType(x, true);
        }).join(' | ')
        : getType(expected));
    throw new InvalidTypeError(`Property with name '${name}' is invalid type`, {
      name,
      actualType: getType(actual),
      expectedType
    });
  }

  const resolvedOptions: Partial<Record<keyof AnyPlainObject, any>> = {};

  // Iterate over expected options to filter and validate the input options
  for (const [key, expectedTypeArray] of Object.entries(expectedOpts)) {
    const [expectedType, defaultValue] = expectedTypeArray as OptionConfig;
    let isValid = false;

    if (key in inOpts) {
      const value = inOpts[key];

      // Handle string type checks
      if (typeof expectedType === 'string') {
        switch (expectedType) {
          case 'array':
            isValid = Array.isArray(value);
            break;
          case 'function':  // Any function but not a ES6 class
            isValid = !isClass(value);
            break;
          default:
            isValid = typeof value === expectedType;
            break;
        }
      }
      // Handle class instance checks
      else if (isCallable(expectedType)) {
        isValid = value instanceof expectedType;
      }
      // Handle multiple type checks
      else if (Array.isArray(expectedType)) {
        isValid = expectedType.some(type => {
          if (typeof type === 'string') {
            if (type === 'array') return Array.isArray(value);
            if (type === 'function') return typeof value === 'function' && !isClass(value);
            return typeof value === type;
          } else if (isCallable(type)) {
            return value instanceof type;
          }
          return false;
        });
      }

      resolvedOptions[key] = isValid ? value : (useDefault ? defaultValue : undefined);  // Assign the value
      if (!isValid) _throw(key, value, expectedType);  // Optionally throw if got any invalid type
    } else {
      // No error being thrown here
      resolvedOptions[key] = (useDefault ? defaultValue : undefined);
    }
  }

  return resolvedOptions as Partial<{ [K in keyof T]: T[K] }>;
}

/**
 * Merges two objects shallowly by overriding properties from `source`
 * with those from `replacer` only if the `replacer` value is not `undefined`.
 *
 * Properties in `replacer` with `undefined` values are ignored, meaning
 * the corresponding `source` properties will be preserved.
 *
 * @param source - The source object to copy properties from.
 * @param replacer - The object containing properties to override in `source`.
 * @param mergeUndefinedVal - Whether to merge `undefined` values from `replacer` into `source`.
 *                            Defaults to `false`.
 *
 * @returns A new object with merged properties.
 *
 * @internal
 * @since    5.0.0
 */
export function merge<T extends AnyPlainObject, U extends Partial<T>>(
  source: T,
  replacer: U,
  mergeUndefinedVal = false
): { [K in keyof T]: (T & U)[K] } {
  const result: { [K in keyof AnyPlainObject]: (T & U)[K] } = { ...source }; // start with all props from source

  for (const [key, value] of Object.entries(replacer)) {
    if (mergeUndefinedVal || !isUndefined(value)) result[key] = value;
  }

  return result as { [K in keyof T]: (T & U)[K] };
}

/**
 * Creates a new object by dynamically removing properties from the input object
 * whose values are strictly `null` or `undefined` at runtime.
 *
 * @remarks
 * The returned object's type reflects the properties that *could* exist after
 * this cleaning, with their values guaranteed to be non-nullable and the properties
 * themselves made mandatory. However, due to runtime filtering, some properties
 * (even if their type allows non-null values) might be absent in the actual
 * returned object if their original value was `undefined` or `null`.
 *
 * @param obj - The input object to filter null and undefined values from.
 * @return The filtered object without null and undefined values.
 *
 * @internal
 * @since    5.0.0
 */
export function dropNullAndUndefined<T extends AnyPlainObject>(obj: T): Partial<DropNullAndUndefined<T>> {
  const result: AnyPlainObject = {};

  for (const [key, value] of Object.entries(obj)) {
    if (!isNullish(value)) result[key] = value;
  }

  return result as Partial<DropNullAndUndefined<T>>;
}

/**
 * Resolves the InnerTube configuration by merging the provided configurations.
 *
 * If the given configurations are specified, the global configuration will be ignored
 * and merge all the configurations.
 *
 * If all configurations are undefined or empty, the global configuration will be used as fallback.
 *
 * @param global - The global InnerTube configuration.
 * @param configs - An array of InnerTube configurations to merge.
 *
 * @return The resolved InnerTube configuration.
 *
 * @internal
 * @since 5.0.0
 * @see {@link defaults.GetInfoOptions.innerTubeConfig | Default InnerTube config}
 */
export function resolveInnertubeConfig(global: SessionOptions, configs: SessionOptions[]): SessionOptions {
  // If all configurations are undefined, return the global configuration
  if (!configs.every(isPlainObject)) return global;

  // Do not use global config if any configuration is defined
  if (configs.some(config => isPlainObject(config) && Object.keys(config).length > 0)) {
    let resolvedConfig = {} as SessionOptions;
    for (const config of configs) {
      resolvedConfig = merge(resolvedConfig, config);
    }
    return resolvedConfig;
  }

  return global;  // All configurations are undefined or empty
}
