/**
 * **YTMP3-JS Global Configuration Module**
 *
 * This module provides configuration options for the **YTMP3-JS** library,
 * allowing you to customize the download and conversion process for YouTube
 * videos to audio files when using the command-line interface (CLI).
 *
 * The configuration is divided into two main sections:
 * 
 * - `downloadOptions`: Options related to the download process.
 * - `audioConverterOptions`: Options related to the audio conversion process.
 *
 * ### Usage
 *
 * Modify the configuration options as needed before running the CLI commands
 * to ensure the download and conversion processes behave as desired.
 *
 * > **NOTE**  
 * > This configuration is intended for non-programmatic use. For programmatic
 * > configurations, consider directly using the library's API.
 *
 * Project: [ytmp3-js](https://github.com/mitsuki31/ytmp3-js)
 *
 * @module ytmp3-js_config
 * @since  1.0.0
 */

'use strict';

const path = require('node:path');

module.exports = {
  /**
   * Options to configure the download process.
   *
   * @type {module:ytmp3~DownloadOptions}
   * @namespace
   */
  downloadOptions: {
    /**
     * The current working directory path.
     *
     * If this option is set to `null` or `undefined`, the path defaults to the
     * current directory ('.'). When navigating to another directory, it will be
     * set to that directory.
     *
     * @type {?string}
     * @default '.'
     */
    cwd: path.resolve(__dirname, '..'),
    /**
     * The output directory path for the downloaded files.
     *
     * This path is resolved relative to the `cwd` option. For example, if `cwd`
     * is set to "directoryA" and `outDir` is set to "music", this option will
     * resolve to "/path/to/directoryA/music".
     * 
     * If this option is `null` or `undefined`, it defaults to the current directory.
     *
     * @type {?string}
     * @default '.'
     */
    outDir: 'download',
    /**
     * Whether to convert the downloaded audio files to a specific format.
     *
     * Set this to `false` if you want to keep the downloaded audio files in
     * AAC (Advanced Audio Coding) format with a '.m4a' extension.
     *
     * To configure the audio converter options, refer to the `audioConverterOptions`
     * field.
     *
     * @type {?boolean}
     * @default true
     */
    convertAudio: true,
    /**
     * Whether to suppress the output log messages during the download process.
     *
     * If this option is enabled, all informational and error messages, including
     * the download progress bar, will be suppressed.
     *
     * @type {?boolean}
     * @default false
     */
    quiet: false
  },
  /**
   * Options to configure the audio converter options.
   *
   * This field will be ignored if the `downloadOptions.convertAudio` option
   * is set to `false`.
   *
   * <pre>
   * ================================ [ WARNING ] ================================
   * >>>> USER EXPERIENCED ONLY! <<<<
   * All options in this field depend on the respective libraries included with
   * the FFmpeg library installed on your system. It is possible that some codecs
   * and encoders may not be included in your FFmpeg installation. Please check
   * what codecs and encoders are supported before changing these options.
   * 
   * If your system does not have the FFmpeg binaries and libraries installed,
   * it is recommended to disable the `downloadOptions.convertAudio` option.
   * The program will automatically detect the absence of FFmpeg and skip the
   * audio conversion to avoid errors.
   * ================================ ----------- ================================
   * </pre>
   *
   * @type {module:audioconv~ConvertAudioOptions}
   * @namespace
   */
  audioConverterOptions: {
    /**
     * The output audio format to use.
     *
     * The output file's extension will be derived from this value.
     * If unspecified or set to a nullable value, it defaults to 'mp3'.
     *
     * @type {?string}
     * @default 'mp3'
     */
    format: 'mp3',
    /**
     * The output audio codec to use.
     *
     * If unspecified or set to a nullable value, it will defaults to 'libmp3lame'
     * (MP3 codec).
     *
     * @type {?string}
     * @default 'libmp3lame'
     */
    codec: 'libmp3lame',
    /**
     * The output audio bitrate in kbps, with an optional 'k' suffix.
     *
     * @type {?(number | string)}
     * @default 128
     */
    bitrate: 128,
    /**
     * The output audio sampling frequency in Hertz (Hz).
     *
     * @type {?number}
     * @default 44100
     */
    frequency: 44100,
    /**
     * The number of output audio channels.
     *
     * Set this option to 2 for stereo, or 1 for mono.
     *
     * @type {?number}
     * @default 2
     */
    channels: 2,
    /**
     * Whether to delete the original file after conversion.
     *
     * If you set this to `false`, the original or unconverted file will remain
     * available in the output directory.
     *
     * @type {?boolean}
     * @default true
     */
    deleteOld: true,
    /**
     * Whether to suppress the conversion progress and error messages.
     *
     * @type {?boolean}
     * @default false
     */
    quiet: false
  }
};
