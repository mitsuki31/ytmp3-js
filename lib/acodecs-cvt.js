/**
 * `acodecs-cvt` is an abbreviation for Audio Codecs Converter, this module
 * provides a function to convert audios to MP3 format utilizing the
 * `fluent-ffmpeg` module.
 * 
 * @module    acodecs-cvt
 * @requires  module:utils
 * @author    Ryuu Mitsuki (https://github.com/mitsuki31)
 * @license   MIT
 * @since     0.2.0
 */

'use strict';

const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');


const { logger: log } = require('./utils');

/**
 * Options for configuring the audio conversion.
 *
 * @typedef  {Object} ConvertAudioOptions
 * @property {string} options.format - The desired output format (e.g., `'mp3'`, `'aac'`).
 * @property {string | number} options.bitrate - The audio bitrate (e.g., `'128k'`),
 *                                               it may be a number or a string with an optional `k` suffix.
 * @property {number} options.frequency - The audio sampling frequency in Hz.
 * @property {string} options.codec - The audio codec to use (e.g., `'libmp3lame'`).
 * @property {number} options.channels - The number of audio channels (`2` for stereo).
 * @property {boolean} options.deleteOld - Whether to delete the original file after conversion.
 *
 * @since    1.0.0
 */

/**
 * Default options of audio converter options.
 *
 * Any option that are not specified on `options` argument in `convertAudio` function
 * will fallback to this options.
 *
 * @type  {ConvertAudioOptions}
 * @since 0.2.0
 */
const defaultOptions = {
  format: 'mp3',
  bitrate: '128k',
  frequency: 44100,
  codec: 'libmp3lame',
  channels: 2,
  deleteOld: true
};

function convertToMp3(inFile, options = optionsMp3) {
    // Regular expressions for audio codecs
    const audioCodecRegex = /(mp3|aac|wav|flac|ogg|wma|opus|amr|m4a)/i,      // All known extension names of audio file
          noExtRegex = new RegExp(`(.+)(?:\\.${audioCodecRegex.source})$`);  // Get the file name without its extension
    
    // Rename file extension to MP3 for the output file
    const outFile = path.join(
        path.dirname(inFile),
        `${noExtRegex.exec(path.basename(inFile))[1]}.${options.format}`
    );
    
    // Store the file names only without their path directories
    const ioBaseFile = [
        path.basename(inFile),
        path.basename(outFile)
    ];
    
    console.log(`[INFO] Processing '${noExtRegex.exec(ioBaseFile[0])[1]}' ...`);
    ffmpeg(inFile)  // Input
        // Options
        .toFormat(options.format)
        .audioBitrate(options.bitrate)
        .audioCodec(options.codec)
        .audioChannels(options.channels)
        .audioFrequency(options.frequency)
        
        // Handlers
        .on('error', (err) => {
            console.error(err);
        })
        .on('progress', (info) => {
            const percentage = Math.floor(info.percent);
            // Write the progression percentage to the console
            process.stdout.write(
                `[INFO] Progress: ${percentage < 0 ? 0 : percentage}%\r`);
        })
        .on('end', () => {
            console.log(`[DONE] Audio processed for '${ioBaseFile[1]}'.`);
            
            // Remove the old audio file
            fs.unlink(inFile, (err) => {
                if (err) console.error(err);
            });
        })
        .save(outFile);  // Output
}


module.exports = {
    optionsMp3,
    convertToMp3
};
