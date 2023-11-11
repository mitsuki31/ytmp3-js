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
}
