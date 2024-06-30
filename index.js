#!/usr/bin/env node

/**
 * Main module for **YTMP3** project to download YouTube videos as audio files using CLI.
 *
 * @requires  lib/utils
 * @requires  lib/ytmp3
 * @author    Ryuu Mitsuki (https://github.com/mitsuki31)
 * @license   MIT
 * @since     0.1.0
 */

'use strict';

const fs = require('fs');      // File system module
const path = require('path');  // Path module

const {
  defaultOptions: defaultAudioConvOptions,
  checkFfmpeg,
  convertAudio,
} = require('./lib/audioconv');
const { logger: log } = require('./lib/utils');
const ytmp3 = require('./lib/ytmp3');

const DEFAULT_BATCH_FILE = path.join(__dirname, 'downloads.txt');

/**
 * Gets the input argument from the command line arguments.
 *
 * If the first argument is a valid URL, the function returns the URL.
 * Otherwise, if the first argument is a batch file path, the function
 * returns the file path.
 *
 * @returns {URL | string} - The input argument from the command line;
 *                     either a `URL` object or a batch file path.
 *
 * @throws {Error} If no batch file is specified.
 *
 * @private
 * @since   0.2.0
 */
function getInput() {
  const args = process.argv.slice(2);  // Get all arguments except the first two

  if (args.length) {
    try {
      // Attempt to parse the first argument as a URL
      // if failed, then the input it may be a batch file
      return new URL(args[0]);
    } catch (error) {
      return args[0];
    }
  }

  // If no argument is specified, then return the default batch file path
  log.info('\x1b[2mNo URL and batch file specified, using default batch file\x1b[0m');
  if (!fs.existsSync(DEFAULT_BATCH_FILE)) {
    log.error(
      `Default batch file named \x1b[93m${
        path.basename(DEFAULT_BATCH_FILE)}\x1b[0m does not exist`);
    log.error('Aborted');
    process.exit(1);
  }
  return DEFAULT_BATCH_FILE;
}

module.exports = Object.freeze({
  // :: ytmp3 (Core)
  name: ytmp3.name,
  version: ytmp3.version,
  singleDownload: ytmp3.singleDownload,
  batchDownload: ytmp3.batchDownload,
  getVideosInfo: ytmp3.getVideosInfo,
  // :: audioconv
  defaultAudioConvOptions,
  checkFfmpeg,
  convertAudio,
});



if (require.main === module) {
  const input = getInput();

  if (input instanceof URL) {
    log.info('URL input detected!');
    ytmp3.singleDownload(input);
  } else {
    if (input !== DEFAULT_BATCH_FILE && !fs.existsSync(input)) {
      log.error(`Batch file named \x1b[93m${input}\x1b[0m does not exist`);
      log.error('Aborted');
      process.exit(1);
    }
    ytmp3.batchDownload(input);
  }
}
