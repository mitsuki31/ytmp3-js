/**
 * `acodecs-cvt` is an abbreviation for Audio Codecs Converter.
 * @author Ryuu Mitsuki
 * @since  0.2.0
 */

'use strict';

const fs = require('fs'),
      path = require('path'),
      ffmpeg = require('fluent-ffmpeg');

const optionsMp3 = {
    format: 'mp3',
    bitrate: '128k',
    frequency: 44100,
    codec: 'libmp3lame',
    channels: 2
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
    
    console.log(`Processing '${noExtRegex.exec(ioBaseFile[0])[1]}' ...`);
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
                `Progress: ${percentage < 0 ? 0 : percentage}%\r`);
        })
        .on('end', () => {
            console.log('All done successfully.');
        })
        .save(outFile);  // Output
}


module.exports = {
    optionsMp3,
    convertToMp3
};
