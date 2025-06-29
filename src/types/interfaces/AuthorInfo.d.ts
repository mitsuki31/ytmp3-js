/**
 * @module    types/interfaces/AuthorInfo
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import type { YT } from 'youtubei.js';

/**
 * Author info object.
 * @public
 */
export default interface AuthorInfo {
  /** Author name */
  name?: YT.VideoInfo["basic_info"]["author"];
  id?: NonNullable<YT.VideoInfo["basic_info"]["channel"]>["id"];
  /** Author URL (typically refers to YouTube channel) */
  url?: NonNullable<YT.VideoInfo["basic_info"]["channel"]>["url"];
  // TODO: Add verified flag and subscriber count
}
