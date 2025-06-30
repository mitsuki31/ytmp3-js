/**
 * This module handles configuration resolution for the **YTMP3-JS** project.
 *
 * This module offers a parser and resolver for the configuration file of YTMP3-JS,
 * which can parse both JSON and JS configuration file (support both CommonJS and
 * ES module). You can see the {@link KNOWN_CONFIG_EXTS} constant to check the
 * supported configuration file's extension names.
 *
 * The {@link parseConfig} function will parse and automatically resolve the configuration file
 * containing the download options and audio converter options (if defined). Before being resolved,
 * the configuration file will being validated first and will throws a {@link InvalidTypeError} if any known
 * configuration options has an invalid type, or throws a {@link UnknownOptionError} if
 * there is an unknown option defined within the configuration object (see the {@link KNOWN_OPTIONS}).
 *
 * @example <caption> JSON Configuration File (<code>ytmp3-js.json</code>) </caption>
 * ```json
 * {
 *   "downloadOptions": {
 *     "outDir": "/path/to/download/folder",
 *     "quiet": false,
 *     "convertAudio": true,
 *     "converterOptions": {
 *       "format": "opus",
 *       "codec": "libopus",
 *       "channels": 1,
 *       "deleteOld": true
 *     }
 *   }
 * }
 * ```
 *
 * @example <caption> CommonJS Module Configuration File (<code>ytmp3-js.config.cjs</code>) </caption>
 * ```js
 * module.exports = {
 *   downloadOptions: {
 *     outDir: '..',
 *     convertAudio: false,
 *     quiet: true
 *   }
 * }
 * ```
 *
 * @example <caption> ES Module Configuration File (<code>ytmp3-js.config.mjs</code>) </caption>
 * ```js
 * import os from 'node:os';
 *
 * export default {
 *   downloadOptions: {
 *     cwd: os.homedir(),
 *     outDir: 'downloads',  // {cwd}/downloads
 *     convertAudio: true
 *   },
 *   audioConverterOptions: {
 *     format: 'mp3',
 *     codec: 'libmp3lame',
 *     frequency: 48000,
 *     bitrate: '128k'
 *     deleteOld: true
 *   }
 * }
 * ```
 *
 * @example <caption> Configute the YouTube session </caption>
 * ```js
 * export default {
 *   innertubeConfig: {
 *     cookie: 'YOUR_YOUTUBE_COOKIE',  // Sign in using cookie (recommended)
 *     client_type: 'WEB',
 *     enable_safety_mode: true,  // Enable family mode
 *   }
 * }
 * ```
 *
 * @module    core/config
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     1.0.0
 */

import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import { ls, lsTypes } from 'lsfnd';

import { YTMP3_HOMEDIR, isNullOrUndefined, isObject, isPlainObject, getType, style as $c, isString, isUndefined, createLogger, NoneLogger, style } from '#/utils';
import { _DownloadOptions, _AudioConverterOptions, dropNullAndUndefined, resolve as resolveOptions, defaults, _InnerTubeConfig } from "#utils/options";
import { UnknownOptionError, InvalidTypeError, ConfigParserError, GlobalConfigParserError } from '#error';
import { KNOWN_OPTIONS, KNOWN_CONFIG_EXTS, PRIORITIZED_CONFIG_FILES } from '#globals';
import type { DownloadOptions, AudioConverterOptions, DeveloperOptions } from '#/types/ytmp3';
import type { ConfigParserOptions, FindConfigOptions, ResolvedYTMP3Config, ResolvedYTMP3ConfigWithDev, YTMP3Config, YTMP3ConfigCJS, YTMP3ConfigESM } from '#/types/config';
import type { NonReadonly } from '#/types/utils';

/**
 * A string representating the format of error message.
 * Can be formatted using `util.format()` function.
 *
 * First occurrence of `'%s'` will be intepreted as error message, the second
 * as the directory name of configuration file, and the third one as the base name
 * of the configuration file.
 *
 * @internal
 * @since    1.0.0
 */
export const CONFIG_ERR_FORMAT = `%s\n\tat ${$c([0, 'BBK'], '%s')}\n${$c([0, '^', 'BR'], '%s')}\n`;


// #region Config Resolver

function resolveConfigModule(
  module: YTMP3ConfigCJS | YTMP3ConfigESM,
  onlyCheck?: boolean,
  useDefault?: boolean,
  file?: string
): ResolvedYTMP3Config;
function resolveConfigModule(
  module: YTMP3ConfigCJS | YTMP3ConfigESM,
  onlyCheck: true,
  useDefault?: boolean,
  file?: string
): YTMP3Config;
function resolveConfigModule(
  module: null,
  onlyCheck?: boolean,
  useDefault?: boolean,
  file?: string
): null;
function resolveConfigModule(
  module: YTMP3ConfigCJS | YTMP3ConfigESM | null,
  onlyCheck?: boolean,
  useDefault?: boolean,
  file?: string
): ResolvedYTMP3Config | YTMP3Config | null {
  let moduleCopy = { ...module } as typeof module;
  const resolved = {} as ResolvedYTMP3Config;

  // Return null if module is nullish
  // Intended for runtime check
  if (isNullOrUndefined(module)) return null;

  // Resolve default property from ES module
  if (isObject(moduleCopy)
    && Object.keys(moduleCopy).length === 1
    && Object.prototype.hasOwnProperty.call(moduleCopy, 'default')
  ) {
    moduleCopy = (moduleCopy as { default: YTMP3Config }).default;  // Extract the default export
  }

  if (onlyCheck) {
    configChecker({ config: moduleCopy as YTMP3Config, file });
    return moduleCopy as YTMP3Config;  // Return unresolved
  } else {
    Object.assign(resolved, resolveConfig({ config: moduleCopy as YTMP3Config, useDefault, file }));
  }

  return resolved;
}

/**
 * Resolves the configuration for YTMP3-JS from a given configuration object.
 *
 * This function takes a configuration object typically sourced from a config file
 * (e.g., `ytmp3-js.config.js`) and ensures that it adheres to the expected structure
 * and types. It specifically resolves the download options and the audio converter
 * options, providing fallbacks and handling type checks.
 *
 * @param options - The options object containing the configuration.
 *
 * @returns The resolved download options and audio conversion options if provided.
 *
 * @throws {@link UnknownOptionError} If there is an unknown field in the configuration object.
 * @throws {@link InvalidTypeError} If any known option is invalid type.
 *
 * @internal
 * @since    1.0.0
 */
function resolveConfig({ config, file, useDefault = true }: {
  /** The configuration object to be resolved. */
  config: YTMP3Config;
  /** The file path from which the config object was sourced, used for error reporting. */
  file?: string;
} & Pick<ConfigParserOptions, "useDefault">): ResolvedYTMP3Config {
  // Set file to '(unknown)' if given file is not a string type
  if (!isString(file)) file = '(unknown)';

  // Check and validate the configuration
  configChecker({ config, file });

  // By using this below logic, if user specified with any falsy value
  // or unspecified it will uses the fallback value instead
  let downloadOptions = config.downloadOptions || {};
  let audioConverterOptions = config.audioConverterOptions || {};
  let innertubeConfig = config.innertubeConfig || {};
  let developer_options = (config as ResolvedYTMP3ConfigWithDev).developer_options || {};

  // Drop any nullable properties
  downloadOptions = dropNullAndUndefined<DownloadOptions>(downloadOptions);
  audioConverterOptions = dropNullAndUndefined<AudioConverterOptions>(audioConverterOptions);
  // This one has a special case, because the `client_type` option is different from the `SessionOptions`
  innertubeConfig = dropNullAndUndefined<typeof innertubeConfig>(innertubeConfig);
  developer_options = dropNullAndUndefined<DeveloperOptions>(developer_options);

  try {
    // Resolve the download options
    downloadOptions = resolveOptions(downloadOptions, _DownloadOptions, true, useDefault);
    // Resolve the audio converter options, but all unspecified options will
    // fallback to undefined value instead their default value
    audioConverterOptions = resolveOptions(audioConverterOptions, _AudioConverterOptions, true, useDefault);
    innertubeConfig = resolveOptions(innertubeConfig, _InnerTubeConfig, true, useDefault);
  } catch (cause) {
    if (cause instanceof Error) {
      throw new ConfigParserError('An error occurred while parsing configuration file', {
        path: file,
        cause
      });
    }
  }

  // Resolving paths
  downloadOptions.cwd = isString(downloadOptions.cwd)
    ? (path.isAbsolute(downloadOptions.cwd)
        ? path.normalize(downloadOptions.cwd)
        : path.resolve(downloadOptions.cwd)
      )
    : defaults.DownloadOptions.cwd;
  downloadOptions.outDir = isString(downloadOptions.outDir)
    ? (path.isAbsolute(downloadOptions.outDir)
        ? path.normalize(downloadOptions.outDir)
        : path.join(downloadOptions.cwd, downloadOptions.outDir)
      )
    : defaults.DownloadOptions.outDir;

  return {
    downloadOptions,
    audioConverterOptions,
    innertubeConfig,
    developer_options
  } as ResolvedYTMP3ConfigWithDev;
}

/**
 * Checks the given configuration for validity.
 *
 * This function ensures that the configuration object adheres to the expected structure
 * and types. It checks for unknown fields and validates the types of known options.
 * Throws an error if there any known options is not object type or if there are
 * unknown fields defined in the configuration.
 *
 * @param options - The options to configure the checker behavior.
 *
 * @throws {@link InvalidTypeError} If the given `config` argument is not a plain object type or
 *                                  any known option is not an object type.
 * @throws {@link UnknownOptionError} If there is an unknown field in the configuration object.
 *
 * @internal
 * @since    1.0.0
 */
function configChecker({ config, file }: { config: YTMP3Config, file?: string }): void {
  let dirFile = '';
  let baseFile = '<unknown>';
  if (isString(file)) {
    file = path.resolve(file);
    dirFile = path.dirname(file);
    baseFile = path.basename(file);
  }

  (Object.keys(config) as (keyof YTMP3Config)[]).forEach(function (field) {
    // Check for unknown field as option within the configuration options
    if (!(Array.from(KNOWN_OPTIONS as NonReadonly<typeof KNOWN_OPTIONS>).includes(field))) {
      throw new UnknownOptionError(util.format(CONFIG_ERR_FORMAT,
        `Unknown configuration field: '${field}' (${typeof config[field]})`,
        dirFile, baseFile
      ));
    }

    // Check for known options have a valid type (object)
    if (!isUndefined(config[field]) && !isPlainObject(config[field])) {
      throw new InvalidTypeError(
        util.format(CONFIG_ERR_FORMAT, `Expected type of field '${field}' is an object`, dirFile, baseFile), {
        actualType: getType(field),
        expectedType: getType({})
      });
    }
  });
}

// #endregion Config Resolver

// #region Config Parser

/**
 * Parses a configuration file and either resolves or validates its contents.
 *
 * This function can handle both CommonJS and ES module formats for configuration files.
 * When importing an ES module, it returns a `Promise` that resolves to the configuration
 * object. It also supports optional resolution of the configuration.
 * 
 * @param configFile - A string path refers to the configuration file.
 * @param options - Options to configure the parser behavior.
 *
 * @returns The configuration object or a `Promise` that fullfilled with the
 *          configuration object if an ES module is imported. The returned configuration
 *          object will be automatically resolved (default behavior), unless `options.onlyCheck`
 *          is set to `true`.
 *
 * @throws {@link InvalidTypeError} If the given `configFile` is not a string.
 * @throws {Error} If the file extension is not supported or if an error occurs during import.
 * 
 * @example <caption> Synchronously parse a CommonJS configuration file </caption>
 * ```js
 * const config = parseConfig('./config.js');
 * console.log(config);
 * ```
 * 
 * @example <caption> Asynchronously parse an ES module configuration file </caption>
 * ```js
 * parseConfig('./config.mjs').then((config) => {
 *   console.log(config);
 * }).catch((error) => {
 *   console.error('Failed to load config:', error);
 * });
 * ```
 *
 * @internal
 * @since    1.0.0
 * @see      {@link resolveConfig}
 * @see      {@link importConfig}
 */
export function parseConfig(
  configFile: string,
  options?: ConfigParserOptions & { forceRequire?: boolean }
): Promise<ResolvedYTMP3Config | YTMP3Config>;
export function parseConfig(
  configFile: string,
  options: ConfigParserOptions & { forceRequire: true }
): ResolvedYTMP3Config | YTMP3Config;
export function parseConfig(
  configFile: string,
  options?: ConfigParserOptions,
): ResolvedYTMP3Config | YTMP3Config | Promise<ResolvedYTMP3Config | YTMP3Config> {
  if (!configFile || typeof configFile !== 'string') {
    throw new InvalidTypeError('Expected a string path refers to a configuration file', {
      actualType: getType(configFile),
      expectedType: 'string'
    });
  }

  const { onlyCheck = false, forceRequire = false, useDefault = true } = options || {};
  const posixOrWin32 = (['posix', 'win32'] as const)[Number(process.platform === 'win32')];

  const file = path.resolve(configFile);  // Copy and resolve path
  let ext = path.extname(configFile);     // Extract the extension name
  ext = path.extname(configFile.replace(new RegExp(`${ext}$`), '')) + ext;

  if (!(KNOWN_CONFIG_EXTS.includes(ext as typeof KNOWN_CONFIG_EXTS[number]))) {
    throw new Error(`Supported configuration file is: ${
      KNOWN_CONFIG_EXTS.map(x => `'${x}'`).join(' | ')
    }`);
  }

  configFile = (path[posixOrWin32].isAbsolute(configFile)
    ? path[posixOrWin32].normalize(configFile)
    : path[posixOrWin32].resolve(configFile.replace(
        new RegExp(posixOrWin32 === 'win32' ? '\\/' : '\\\\'),
        path[posixOrWin32].sep
      ))
  ).trim();

  // Import the configuration file
  let config: YTMP3Config | PromiseLike<YTMP3Config> | null = null;
  // Only include '.cjs' and '.json' to use require() or if the `forceRequire` is set to true
  if (['.config.cjs', '.json'].includes(ext) || forceRequire) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    config = require(configFile);
  } else {
    // On Windows, replace all '\' with '/' to be able to use `import()`
    // WARNING: THIS APPROACH MIGHT NOT BEHAVE AS EXPECTED ON EVERY SUBSYSTEMS IN WINDOWS!
    //          But currently, there is no known issues or unexpected behavior on Windows Subsystem Linux (WSL)
    //          and has been tested thousand times in local and CI environment.
    if (process.platform === 'win32') {
      configFile = 'file:///' + configFile.replace(/\\/g, '/');
    }
    config = Promise.resolve(import(configFile));
  }

  if (config instanceof Promise) {
    // Return a Promise if the imported config module is an ES Module
    return new Promise<ResolvedYTMP3Config | YTMP3Config>(function (resolve, reject) {
      (config as Promise<YTMP3Config>)
        .then((result) => resolve(resolveConfigModule(result, onlyCheck, useDefault, file)))
        .catch((err) => reject(err));
    });
  }

  // Resolve the module (include both CommonJS and ES module)
  return resolveConfigModule(config as YTMP3Config, onlyCheck, useDefault, file);
}

/**
 * An alias for {@linkcode parseConfig} function, with `onlyCheck` option is always set to `false`.
 *
 * @param file - A string path refers to the configuration file to import and resolve.
 * @param options - An object to configure the import behavior.
 *
 * @internal
 * @since    1.0.0
 * @see      {@link parseConfig}
 */
export function importConfig(file: string, options?: ConfigParserOptions & { forceRequire?: boolean }): Promise<ResolvedYTMP3Config | YTMP3Config>;
export function importConfig(file: string, options: ConfigParserOptions & { forceRequire: true }): ResolvedYTMP3Config | YTMP3Config;
export function importConfig(file: string, options?: ConfigParserOptions) {
  return parseConfig(file, { forceRequire: false, ...options, onlyCheck: false });
}

// #endregion Config Parser

// #region Global Config Parser

/**
 * Finds the absolute path to the global configuration file for ytmp3-js.
 *
 * This function searches a specified directory (or a default {@link YTMP3_HOMEDIR | **YTMP3-JS** home directory})
 * for configuration files with known extensions (e.g., `'.json'`, `'.js'`).
 * It prioritizes certain filenames and handles cases where a prioritized file might be empty,
 * falling back to the first non-empty alternative if available, ensuring that the returned
 * file path is a valid and non-empty configuration file.
 *
 * The function first retrieves a list of configuration files in the specified directory that 
 * match a set of known file extensions ({@linkcode KNOWN_CONFIG_EXTS}).
 * If exactly one file is found, its basename is returned immediately. If multiple configuration
 * files are present, the function prioritizes specific configuration file names in the following order:
 *
 * | Priority |         File Name        |
 * | -------- | ------------------------ |
 * | #1       | `ytmp3-js.config.cjs`    |
 * | #2       | `ytmp3-js.config.mjs`    |
 * | #3       | `ytmp3-js.config.js`     |
 * | #4       | `ytmp3-js.json`          |
 *
 * If the prioritized file is empty, the function will iterate through other available files 
 * until it finds a non-empty file or exhausts the list.
 *
 * @param searchDir - The directory from where to search the global configuration file.
 *                    Defaults to {@linkcode YTMP3_HOMEDIR}.
 * @param options - An object to configure the search behavior.
 * @returns A Promise that resolves to the absolute path of the found configuration file,
 *          or `null` if no suitable file is found and `throwIfNotFound` is `false`.
 * 
 * @throws {Error} Thrown if one of these conditions are met:
 * - If If `throwIfNotFound` is `true` and `searchDir` is not a valid directory (e.g., a regular file).
 * - If `throwIfNotFound` is `true` and no configuration file is found. (Error code `ENOENT`).
 * - If other file system errors occur during directory checks. This will always be thrown.
 *
 * @internal
 * @since    1.1.0
 * @see      {@link PRIORITIZED_CONFIG_FILES}
 * @see      {@link https://npmjs.com/package/lsfnd | npm:lsfnd} - a Node.js module for finding files
 */
export async function findGlobalConfig(
  searchDir?: string | null,
  options: FindConfigOptions = {}
): Promise<string | null> {
  const { throwIfNotFound = false, debug = false } = options;
  searchDir = isString(searchDir) ? path.normalize(searchDir) : YTMP3_HOMEDIR;

  const knownConfigExtsRegex = new RegExp(`${KNOWN_CONFIG_EXTS.join('|')}$`, 'i');
  const logger = debug ? createLogger('DEBUG') : NoneLogger;

  const createENOENTError = (msg: string, syscall?: string): NodeJS.ErrnoException => {
    const err: NodeJS.ErrnoException = new Error(msg);
    err.code = 'ENOENT';
    err.path = searchDir;
    if (syscall) err.syscall = syscall;
    return err;
  };

  logger.debug(`Checking existence of global configuration directory: ${style('Y', searchDir)}`);
  // Check if searchDir exists and is a directory. If not, return null or throw.
  try {
    const stat = await fs.promises.stat(searchDir);
    if (!stat.isDirectory()) {
      const msg = `Global configuration path '${style('Y', searchDir)}' is not a directory`;
      if (throwIfNotFound) throw createENOENTError(msg, 'stat');
      logger.debug(msg);
      return null;
    }
  } catch (statErr) {
    const err: NodeJS.ErrnoException = statErr as Error;
    if (err.code === 'ENOENT') {
      logger.debug(`Global configuration directory '${style('Y', searchDir)}' does not exist.`);
      // If the directory itself doesn't exist, it's not an error unless `throwIfNotFound` is true
      if (throwIfNotFound) throw err;
      return null;
    }
    // Re-throw other unexpected file system errors
    throw err;
  }

  if (debug) {
    // For logging purposes
    Array.from(PRIORITIZED_CONFIG_FILES.values()).forEach(file => {
      logger.debug(`Searching for config file: ${style('B', file)}`);
    });
  }
  const rawConfigFiles = await ls(searchDir, {
    encoding: 'utf-8',
    match: knownConfigExtsRegex,
    recursive: false,
    absolute: false,
    basename: true  // Get the only the base names (e.g., 'ytmp3-js.config.js')
  }, lsTypes.LS_F);

  const configFiles = (rawConfigFiles || []).filter(name => name.startsWith('ytmp3-js.'));
  logger.debug(
    `Found ${
      style('C', String(configFiles.length))
    } potential global configuration file(s) in '${style('Y', searchDir)}'`
  );

  // If no config files are found, handle based on `throwIfNotFound`
  if (configFiles.length === 0) {
    const msg = `No global configuration file found in directory: ${style('Y', searchDir)}`;
    if (throwIfNotFound) throw createENOENTError(msg);
    logger.debug(msg);
    return null;
  }

  // --- Prioritize and Select Config File ---

  // --- Construct the ordered list of candidate absolute paths ---
  const candidatePaths: string[] = [];
  const processedBasenames = new Set<string>(); // To avoid duplicates
  const sortedPriorities = Array.from(PRIORITIZED_CONFIG_FILES.entries()).sort((a, b) => {
    // The index of `PRIORITIZED_CONFIG_FILES` is not an actual number, but a string with a number suffixed
    return parseInt(a[0].replace(/\D/g, '')) - parseInt(b[0].replace(/\D/g, ''));
  });

  for (const [, prioritizedFilename] of sortedPriorities) {
    if (configFiles.includes(prioritizedFilename)) {
      candidatePaths.push(path.join(searchDir, prioritizedFilename));
      processedBasenames.add(prioritizedFilename);
    }
  }

  // Add any other discovered files that were not prioritized,
  // maintaining their original order from `ls`
  for (const basename of configFiles) {
    if (!processedBasenames.has(basename)) {
      candidatePaths.push(path.join(searchDir, basename));
    }
  }

  if (debug) logger.line(20, logger.DEBUG_PREFIX);
  logger.debug(`Checking ${
    style('C', String(candidatePaths.length))
  } config file(s) for validity and content size.`);

  // --- Single loop to find the first valid, non-empty config file ---
  for (const fullPath of candidatePaths) {
    try {
      const stat = await fs.promises.stat(fullPath);
      if (stat.isFile() && stat.size > 0) {
        logger.debug(`Selected config file: ${style('G', path.basename(fullPath))}`);
        return fullPath; // Found a valid, non-empty config file
      } else {
        logger.debug(`Candidate '${
          style('Y', path.basename(fullPath))
        }' is not a file or is empty. Skipping.`);
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.debug(`Candidate '${
          style('Y', path.basename(fullPath))
        }' does not exist (likely moved/deleted). Skipping.`);
      } else {
        logger.warn(`Error stat-ing candidate config file '${
          style('Y', path.basename(fullPath))
        }': ${(err as Error).message}`);
      }
    }
  }

  // If we reach here, no suitable config file was found (either none, or all were empty/invalid)
  if (throwIfNotFound) {
    throw createENOENTError(`No non-empty global configuration file (ytmp3-js${
      KNOWN_CONFIG_EXTS.join('|')
    }) found in directory: ${style('Y', searchDir)}`);
  }
  return null;
}

/**
 * Parses the global configuration file at the specified path with optional parser options.
 *
 * This function validates the type of the configuration file path and parser options, checks
 * if the file is readable, and imports the configuration file. The `forceRequire` option is 
 * enabled if the file extension is `.json` unless overridden by the provided options.
 *
 * @param globConfigPath - The path to the global configuration file. Must be a valid string.
 * @param parserOptions - Optional settings for parsing the configuration file.
 * @param parserOptions.forceRequire - If `true`, forces the use of `require()` for importing the config file,
 *                                     even if it's an ES module. This is **experimental** and may cause unexpected behavior.
 * 
 * @returns A promise fullfills with the parsed configuration data.
 * 
 * @throws {@link InvalidTypeError} If {@linkcode globConfigPath} is not a string or {@linkcode parserOptions} is not a plain object.
 * @throws {@link GlobalConfigParserError} If the configuration file cannot be accessed.
 * 
 * @internal
 * @since    1.1.0
*/
export function parseGlobalConfig(
  globConfigPath: string,
  parserOptions?: ConfigParserOptions
): ReturnType<typeof parseConfig> | Promise<ReturnType<typeof parseConfig>> {
  if (isNullOrUndefined(globConfigPath) || !isString(globConfigPath)) {
    throw new InvalidTypeError('Unknown configuration file path', {
      actualType: getType(globConfigPath),
      expectedType: 'string'
    });
  }

  parserOptions = isNullOrUndefined(parserOptions) ? {} : parserOptions;
  if (!isPlainObject(parserOptions)) {
    throw new InvalidTypeError('Invalid type of configuration parser options', {
      actualType: getType(parserOptions),
      expectedType: getType({})
    });
  }

  // Check if the configuration file is readable
  try {
    fs.accessSync(globConfigPath, fs.constants.R_OK);
  } catch (accessErr) {
    if (accessErr instanceof Error) throw new GlobalConfigParserError(
      'Unable to access the global configuration file', { cause: accessErr });
  }

  // Import the configuration file
  let parsed: ReturnType<typeof parseConfig> | undefined;
  try {
    parsed = parseConfig(globConfigPath, parserOptions);
  } catch (err) {
    if (err instanceof Error) {
      throw new GlobalConfigParserError('Unable to parse the global configuration file', { cause: err });
    }
  }

  if (parsed instanceof Promise) {
    return parsed.catch(err => {
      throw new GlobalConfigParserError('Unable to parse the global configuration file', { cause: err });
    });
  }

  return parsed as NonNullable<typeof parsed>;
}
