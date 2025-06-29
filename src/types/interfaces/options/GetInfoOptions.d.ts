/**
 * @module    types/interfaces/options/GetInfoOptions
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import type { SessionOptions } from 'youtubei.js';
import type { ClientOptions } from './ClientOptions';
import type { DeveloperOptions } from './DeveloperOptions';

/**
 * An interface for get info options.
 *
 * @public
 * @since 5.0.0
 */
export interface GetInfoOptions extends ClientOptions, DeveloperOptions {
  /**
   * Configuration used to create a new session of **Innertube**.
   *
   * @see {@link "utils/options".defaults.InnerTubeConfig | InnerTubeConfig} - Default Innertube configuration
   */
  innerTubeConfig?: SessionOptions;
  /**
   * Whether to suppress non-error logging. It is `true` by default, for CLI usage
   * it is set to `false`.
   *
   * @default true
   */
  quiet?: boolean;
}
