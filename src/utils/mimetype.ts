/**
 * @module    utils/mimetype
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

/**
 * Returns the file extension for a given MIME type.
 * Manually parses MIME string without using `MIMEType` class (requires Node.js >= 18).
 *
 * @param mimeStr - MIME type string like `'audio/mp4; codecs="mp4a.40.2"'`
 * @returns File extension with dot, or `'.bin'` if unknown
 *
 * @internal
 * @since 5.0.0
 */
export function getExtensionFromMime(mimeStr: string): string {
  const match = mimeStr.match(/^(\w+)\/([\w.+-]+)(?:;\s*codecs="([^"]+)")?/i);
  if (!match) return '.bin';

  const [, type, subtype, codec = ''] = match;

  if (type === 'audio') {
    switch (subtype) {
      case 'mp4': return '.m4a';
      case 'mpeg': return '.mp3';
      case 'webm': return '.webm';
      case 'ogg': return '.ogg';
    }
    if (codec.startsWith('mp4a')) return '.m4a';
    if (codec.includes('opus')) return '.webm';
    return '.bin';
  }

  if (type === 'video') {
    switch (subtype) {
      case 'mp4': return '.mp4';
      case 'webm': return '.webm';
      case 'ogg': return '.ogv';
    }
    if (codec.includes('avc1') || codec.includes('mp4v')) return '.mp4';
    if (codec.includes('vp8') || codec.includes('vp9')) return '.webm';
    return '.bin';
  }

  return '.bin';
}
