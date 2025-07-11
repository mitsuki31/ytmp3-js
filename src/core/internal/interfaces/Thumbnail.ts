/**
 * @module    core/internal/interfaces/Thumbnail
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

/**
 * Thumbnail object representing the image URL and its dimensions.
 * @public
 */
export default interface Thumbnail {
  /** The URL of the thumbnail image */
  url: string;
  /** The width of the thumbnail image */
  width: number;
  /** The height of the thumbnail image */
  height: number;
}
