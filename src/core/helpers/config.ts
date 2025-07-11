/**
 * @module   core/helpers/config
 * @author   Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license  MIT
 * @since    5.0.0
 */

import type { SessionOptions } from 'youtubei.js';

import { getGlob, hasSetup, setGlob } from '#runtime/env';
import { defaults, merge } from '#utils/options';
import { YTMP3_SYMBOL } from '#/globals';

export {
  type FindConfigOptions,
  type ConfigParserOptions,
  findGlobalConfig,
  parseConfig,
} from '#/core/config';

/**
 * Sets the global InnerTube configuration.
 *
 * @remarks
 * This function will merges the given configuration with the pre-configured InnerTube configuration,
 * overriding any existing values. Any undefined values in the given configuration will be ignored,
 * unless the {@link shouldUndef} parameter is set to `true`.
 *
 * @param config - The configuration options for the Innertube session.
 * @param shouldUndef - If set to `true`, it allows `undefined` values to override existing values.
 *
 * @public
 * @see     {@link defaults.DefaultInnerTubeConfig | Default Innertube config}
 * @since   5.0.0
 */
export function setGlobalInnerTubeConfig(config: SessionOptions, shouldUndef = false): void {
  const globalConfig = getGlob('__globalInnertubeConfig', defaults.InnerTubeConfig) as SessionOptions;
  const mergedConfig = merge(globalConfig, config, shouldUndef);
  if (!hasSetup()) Object.assign(globalThis, { [YTMP3_SYMBOL]: { } });  // Initialize the global state before set global environment
  setGlob('__globalInnertubeConfig', mergedConfig);  // Update the global config
}
