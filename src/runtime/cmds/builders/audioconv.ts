import type { Argv } from 'yargs';

import { splitFfmpegOptions } from '#/core/ffmpeg-cmdp';
import { TITLES } from '#/runtime/cli_conf/misc';

export default function builder(yargs: Argv): Argv {
  yargs
    .option('C', {
      alias: ['convert-audio', 'convertAudio'],
      description: 'Enable audio conversion after download',
      type: 'boolean',
      default: false,
      group: TITLES.audioConv
    })
    .option('in-opt', {
      alias: ['input-options', 'inOpt', 'inputOptions'],
      description: 'Additional FFmpeg input options for audio conversion',
      type: 'string',
      array: true,
      coerce: (value: string) => splitFfmpegOptions(Array.isArray(value) ? value.join(' ') : value),
      group: TITLES.audioConv
    })
    .option('out-opt', {
      alias: ['output-options', 'outOpt', 'outputOptions'],
      description: 'Additional Ffmpeg output options for audio conversion',
      type: 'string',
      array: true,
      coerce: (value: string) => splitFfmpegOptions(Array.isArray(value) ? value.join(' ') : value),
      group: TITLES.audioConv
    })
    .option('format', {
      description: 'Audio output format (e.g., mp3, wav)',
      type: 'string',
      default: 'mp3',
      nargs: 1,
      group: TITLES.audioConv
    })
    .option('e', {
      alias: ['codec', 'encoding'],
      description: 'Audio codec to use (e.g., libmp3lame, aac)',
      type: 'string',
      default: 'libmp3lame',
      nargs: 1,
      group: TITLES.audioConv
    })
    .option('b', {
      alias: ['bitrate'],
      description: 'Audio bitrate (e.g., 128k, 256k)',
      type: 'string',
      default: '128k',  // in bit per second
      nargs: 1,
      group: TITLES.audioConv
    })
    .option('r', {
      alias: ['frequency', 'resampling'],
      description: 'Audio sampling frequency (e.g., 44k, 48k)',
      type: 'string',
      default: '48k',  // in Hertz
      nargs: 1,
      group: TITLES.audioConv
    })
    .option('channels', {
      description: 'Number of audio channels (2 for stereo)',
      type: 'number',
      choices: [1, 2],
      default: 2,
      nargs: 1,
      group: TITLES.audioConv
    })
    .option('D', {
      alias: ['overwrite', 'delete-old', 'deleteOld'],
      description: 'Overwrite existing files or delete original media after conversion',
      type: 'boolean',
      default: false,
      group: TITLES.audioConv
    })
  ;
  return yargs;
}
