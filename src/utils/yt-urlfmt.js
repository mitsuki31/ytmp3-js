/**
 * @file Provides all supported YouTube URL formats, including standard URL,
 *       shortened URL, channel URL, and playlist URL.
 *
 * YouTube URLs typically follow a few formats:
 *   1. **Standard Video URL:** `https://www.youtube.com/watch?v=VIDEO_ID`
 *   2. **Shortened URLv** `https://youtu.be/VIDEO_ID`
 *   3. **Playlist URL:** `https://www.youtube.com/playlist?list=PLAYLIST_ID`
 *   4. **Channel URL:** `https://www.youtube.com/channel/CHANNEL_ID`
 *   5. **YouTube Music URL:** `https://music.youtube.com/watch?v=VIDEO_ID`
 *
 * These formats allow the library to navigate directly to specific videos, playlists,
 * or channels on YouTube.
 *
 * Additionally, this module also provides the YouTube Music URL pattern.
 * This allows the library to handle a broader range of YouTube-related URLs
 * effectively.
 *
 * @module   utils/yt-urlfmt
 * @author   Ryuu Mitsuki <{@link https://github.com/mitsuki31}>
 * @license  MIT
 * @since    1.0.0
 */

'use strict';

/**
 * An object contains regular expressions for matching various YouTube URL formats.
 *
 * @public
 * @constant
 * @property  {RegExp} STANDARD
 *            Regular expression for matching YouTube standard video URLs of the form(s):  
 *            <ul>
 *              <li>`https://youtube.com/watch?v=VIDEO_ID`</li>
 *              <li>`https://www.youtube.com/watch?v=VIDEO_ID`</li>
 *            </ul>
 * @property  {RegExp} SHORTENED
 *            Regular expression for matching YouTube shortened video URLs of the form(s):  
 *            <ul>
 *              <li>`https://youtu.be/VIDEO_ID`</li>
 *            </ul>
 * @property  {RegExp} VIDEO
 *            Regular expression for matching combined YouTube video URLs (standard
 *            and shortened formats).
 * @property  {RegExp} CHANNEL
 *            Regular expression for matching YouTube channel URLs of the form(s):  
 *            <ul>
 *              <li>`https://youtube.com/channel/CHANNEL_ID`</li>
 *              <li>`https://www.youtube.com/channel/CHANNEL_ID`</li>
 *            </li>
 * @property  {RegExp} PLAYLIST
 *            Regular expression for matching YouTube playlist URLs of the form(s):  
 *            <ul>
 *              <li>`https://youtube.com/playlist?list=PLAYLIST_ID`</li>
 *              <li>`https://www.youtube.com/playlist?list=PLAYLIST_ID`</li>
 *            </ul>
 * @property  {RegExp} MUSIC
 *            Regular expression for matching YouTube Music URLs of the form(s):  
 *            <ul>
 *              <li>`https://music.youtube.com/watch?v=VIDEO_ID`</li>
 *              <li>`https://music.youtube.com/playlist?list=PLAYLIST_ID`</li>
 *            </ul>
 * @since     1.0.0
 */
const YT_URLFORMAT = Object.freeze({
  STANDARD: /^https?:\/\/(?:(www|m)\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_=-]+/,
  SHORTENED: /^https?:\/\/youtu\.be\/[a-zA-Z0-9_=-]+/,
  VIDEO: /^https?:\/\/((?:(www|m)\.)?youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_=-]+/,
  CHANNEL: /^https?:\/\/(?:(www|m)\.)?youtube\.com\/channel\/[a-zA-Z0-9_=-]+/,
  PLAYLIST: /^https?:\/\/(?:(www|m)\.)?youtube\.com\/playlist\?list=[a-zA-Z0-9_=-]+/,
  MUSIC: /^https?:\/\/music\.youtube\.com\/(?:watch\?v=|playlist\?list=)[a-zA-Z0-9_=-]+/
});

module.exports = YT_URLFORMAT;
