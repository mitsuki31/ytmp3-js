/**
 * @module    types/config
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

/** Represents the resolved configuration for YTMP3-JS */
export type ResolvedYTMP3Config = { [K in keyof YTMP3Config]-?: YTMP3Config[K] };
/** @private */
export type ResolvedYTMP3ConfigWithDev = ResolvedYTMP3Config & { developer_options: DeveloperOptions };

export type YTMP3ConfigCJS = YTMP3Config;
export type YTMP3ConfigESM = {} & { default: YTMP3Config };

export * from './interfaces/YTMP3Config';

//! WARNING: THE STRUCTURE SHOULD BE EXACTLY MATCHES WITH `package.json`
/** @private */
export interface PackageJSON {
  name: string;
  title: string;
  version: string;
  description: string;
  author: string;
  license: string;
  homepage: string;
  repository: {
    type: string;
    url: string;
  };
  bugs: {
    url: string;
  };
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

/**
 * Represents a partial setup configuration.
 *
 * @internal
 * @since 5.0.0
 */
export interface SetupPartialConfig {
  "setup.metadata"?: boolean,  // Default to true, it is mandatory
  "setup.log"?: boolean,  // Default to true, it is mandatory
  "setup.ffmpeg"?: boolean,  // Default to false
  "setup.globalEnv"?: boolean,  // Default to true, it is mandatory
  "setup.connectivity"?: boolean,  // Default to false
  "setup.config"?: boolean,  // Default to true, it is mandatory
  "setup.argparser"?: boolean,  // Default to true, it is mandatory
  // It will automatically create a session if the device has an internet connection
  // which depends on "setup.connectivity" setup. If "setup.connectivity" is disabled,
  // it will try to create a session but will never throws if any error occurs during creation.
  "setup.innertubeSession"?: boolean,
}

/**
 * Options for configuring the behavior of configuration file search.
 *
 * @internal
 * @since 5.0.0
 */
export interface FindConfigOptions {
  /**
   * If `true`, throws an `ENOENT` error if no configuration file is found.
   * Defaults to `false`, in which case the function returns `null` if no file is found.
   */
  throwIfNotFound?: boolean;
  /**
   * If `true`, enables debug logging for the configuration search process.
   */
  debug?: boolean;
}

/**
 * Options for configuring the behavior of the configuration file parser.
 */
export interface ConfigParserOptions {
  /**
   * **[EXPERIMENTAL]** Forces the configuration parser to use Node.js's CommonJS `require()`
   * mechanism to import the configuration file, even if the file is detected as an ES Module
   * (e.g., `.mjs` extension).
   *
   * @remarks
   * If this option is left `undefined` or `false`, the parser will automatically determine
   * the appropriate module loading mechanism (`import()` for ES Modules, `require()` for CommonJS)
   * based on the file's extension (`.mjs`, `.cjs`, `.js`). However, the current implementation does not
   * support to detect the nearest `package.json`'s `type` field.
   *
   * ### Why `forceRequire` is Experimental and Not Recommended
   *
   * This option exists primarily for specific edge cases or legacy interoperability, but its use
   * is generally discouraged due to several reasons:
   *
   * 1. **Asymmetric Export Handling:**
   * - When an ES Module is loaded via `import`, its `default` export is directly assigned
   *   to the imported variable (e.g., `import config from './config.mjs'; config` refers to the default export).
   * - When an ES Module is loaded via `require()`, Node.js creates a CommonJS-compatible
   *   wrapper object. The ES Module's `default` export becomes a property named `default`
   *   on the `require()`d object (e.g., `const mod = require('./config.mjs'); mod.default` refers to the default export).
   *   Named exports might also be hoisted to the top level of `mod` or nested under `mod.default`. This
   *   inconsistency can lead to confusing and brittle code.
   *
   * 2. **Loss of ES Module Features:**
   * - If an ES Module configuration file uses `await` outside of an `async` function, attempting to `require()`
   *   it will result in a `SyntaxError` (or `TransformError` depends on Node.js version) because `require()`
   *   is a synchronous operation.
   * - ES Modules are always in strict mode. While CommonJS can opt-in, `require()` doesn't enforce this
   *   for the consuming CommonJS module.
   *
   * 3. **Potential for Unexpected Behavior and Subtle Bugs:**
   * - The interoperability layer can sometimes introduce subtle differences in how module
   *   state or side effects are handled compared to native ES Module loading.
   * - Circular dependencies between CommonJS and ES Modules loaded via `require()` can
   *   behave unpredictably and lead to hard-to-debug issues.
   *
   * 4. **Lack of Future-Proofing:**
   * - The Node.js ecosystem is steadily moving towards native ES Modules. Relying on `require()`
   *   for ES Modules goes against this trend and may lead to compatibility problems with
   *   future Node.js versions or other tools that strictly adhere to ES Module specifications.
   *
   * 5. **Developer Confusion:**
   * - Mixing module systems explicitly or implicitly can make the codebase harder to understand
   *   and maintain for developers who are not intimately familiar with Node.js's module interop specifics.
   *
   * ### When might it be considered (with caution)
   *
   * In rare cases, `forceRequire` might be used as a temporary workaround in a predominantly
   * CommonJS codebase that cannot easily migrate to ES Modules, but needs to consume a new
   * configuration file that is only available as an ES Module. Even then, it's preferable
   * to use dynamic `import()` (which returns a Promise) within a CommonJS context if possible,
   * as it's the officially supported way to load ES Modules from CommonJS.
   *
   * **It is strongly recommended to let the parser automatically determine the module type,
   * or to ensure your configuration files are explicitly CommonJS if you intend to forcily `require()` them.**
   *
   * @default false
   */
  forceRequire?: boolean;

  /**
   * If set to `true`, the parser will skip parsing the configuration and only validate.
   * @default false
   */
  onlyCheck?: boolean;

  /**
   * Whether to use the default value if the configuration option is left unspecified.
   * @default true
   */
  useDefault?: boolean;

  /**
   * If `true`, enables debug logging for the configuration parser process.
   * @default false
   */
  debug?: boolean;
}
