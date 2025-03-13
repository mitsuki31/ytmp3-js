/**
 * @file Main module of **YTMP3-JS** library providing useful APIs to download YouTube audios with ease.
 *
 * @requires  audioconv
 * @requires  error
 * @requires  utils
 * @requires  ytmp3
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     0.1.0
 */

'use strict';

const {
  checkFfmpeg,
  convertAudio
} = require('./lib/audioconv');
const {
  URLUtils,
  FormatUtils,
  InfoUtils,
  ThumbnailUtils
} = require('./lib/utils');
const error = require('./lib/error');
const { defaults } = require('./lib/utils/options');
const ytmp3 = require('./lib/ytmp3');

// Change several default options for `DownloadOptions`
const { DownloadOptions: OldDownloadOptions } = defaults;
defaults.DownloadOptions = Object.freeze({
  ...OldDownloadOptions,
  handler: ytmp3.defaultHandler,
  // Set the `quiet` option to `true` by default
  quiet: true
});

// Change several default options for `AudioConverterOptions`
defaults.AudioConverterOptions = Object.freeze({
  ...defaults.AudioConverterOptions,
  // Set the `quiet` option to `true` by default
  quiet: true
});


Object.assign(ytmp3, {
  // :: audioconv
  checkFfmpeg,
  convertAudio,
  // :: defaults options
  defaults,
  // :: URLUtils
  YTURLUtils: URLUtils,  // aliased to `YTURLUtils` for readability
  extractVideoId: URLUtils.extractVideoId,
  validateUrl: URLUtils.validateUrl,
  validateId: URLUtils.validateId,
  // :: FormatUtils
  FormatUtils,
  // :: InfoUtils
  InfoUtils,
  // :: ThumbnailUtils
  ThumbnailUtils,
  getAllThumbnails: ThumbnailUtils.getAllThumbnails,
  getThumbnailByResolution: ThumbnailUtils.getThumbnailByResolution,
  getThumbnail: ThumbnailUtils.getThumbnail,
  // :: error
  ...error
});

module.exports = Object.freeze(ytmp3);
