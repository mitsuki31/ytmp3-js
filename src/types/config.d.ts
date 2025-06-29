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
