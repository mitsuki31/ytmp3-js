/**
 * @file Main module of **YTMP3-JS** library providing useful APIs to download YouTube audios with ease.
 *
 * @requires  lib/audioconv
 * @requires  lib/error
 * @requires  lib/url-utils
 * @requires  lib/utils
 * @requires  lib/ytmp3
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     0.1.0
 */

'use strict';

const {
  defaultOptions: defaultAudioConvOptions,
  checkFfmpeg,
  convertAudio
} = require('./lib/audioconv');
const URLUtils = require('./lib/utils/url-utils');
const error = require('./lib/error');
const ytmp3 = require('./lib/ytmp3');


module.exports = Object.freeze({
  // :: ytmp3 (Core)
  name: ytmp3.NAME,
  version: ytmp3.VERSION,
  // eslint-disable-next-line camelcase
  version_info: ytmp3.VERSION_INFO,
  singleDownload: ytmp3.singleDownload,
  batchDownload: ytmp3.batchDownload,
  getVideosInfo: ytmp3.getVideosInfo,
  // :: URLUtils
  YTURLUtils: URLUtils,  // aliased to `YTURLUtils` for readability
  extractVideoId: URLUtils.extractVideoId,
  validateUrl: URLUtils.validateUrl,
  validateId: URLUtils.validateId,
  // :: audioconv
  defaultAudioConvOptions,
  checkFfmpeg,
  convertAudio,
  // :: error
  ...error
});
