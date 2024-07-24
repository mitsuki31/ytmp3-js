export default {
  downloadOptions: {
    cwd: 'D:/Downloads',
    outDir: '.',
    convertAudio: true,
    quiet: false
  },
  audioConverterOptions: {
    format: 'mp3',
    codec: 'libmp3lame',
    bitrate: 128,
    frequency: 44100,
    channels: 2,
    deleteOld: true,
    quiet: false
  }
};
