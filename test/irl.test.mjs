/* eslint-disable mocha/no-setup-in-describe */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { EOL } from 'node:os';
import { randomInt } from 'node:crypto';
import {
  getTempPath,
  createTempPath as _createTempPath
} from '@mitsuki31/temppath';
import ffmpeg from 'fluent-ffmpeg';

import audioconv from '../lib/audioconv.js';
import ytmp3 from '../lib/ytmp3.js';
import utils from '../lib/utils/index.js';

const ffprobe = promisify(ffmpeg.ffprobe);
const createTempPath = promisify(_createTempPath);
const ASSETS_DIR = path.join(utils.ROOTDIR, 'test', 'assets');
const AUDIO_ASSETS_DIR = path.join(ASSETS_DIR, 'audio');

function getAudioFile(filename) {
  const audioPath = path.join(AUDIO_ASSETS_DIR, path.basename(filename));
  if (!fs.existsSync(audioPath)) throw new Error(`No such audio file: ${filename}`);
  return audioPath;
}

describe('IRL (In Real Life) Test', function () {
  const videoIDs = [
    'Z0z5mNPODrc',
    'XFkzRNyygfk',
    'jTVG5kdHRQQ'
  ];
  const outDir = getTempPath(path.join(utils.ROOTDIR, 'tmp'), 15);
  const outputFiles = {};
  // Stubs
  const consoleLogStub = console.log;
  const consoleErrorStub = console.error;

  beforeEach(function () {
    console.log = (...args) => {};
    console.error = (...args) => {};
  });

  describe('[DOWNLOAD]', function () {
    consoleLogStub('\x1b[33mCAUTION! Data charge may apply for download tests.\x1b[0m');
    let tempFile;

    before(async function () {
      tempFile = await createTempPath(path.join(utils.ROOTDIR, 'tmp'), {
        maxLen: 28,
        asFile: true,
        ext: 'dl'
      });

      // Write URLs to temporary file for batch download test
      return new Promise((resolve) => {
        const tempFileStream = fs.createWriteStream(tempFile);
        for (const id of videoIDs) {
          tempFileStream.write(`https://youtu.be/${id}${EOL}`);
        }
        tempFileStream.end();
        tempFileStream.on('finish', resolve);
      });
    });

    it('Download YouTube videos using single download', async function () {
      this.timeout(1000 * 60 * 13);  // Give 13 minutes before timeout
      this.slow(1000 * 60 * 5);      // 5 minute

      for (const id of videoIDs) {
        consoleLogStub(`Downloading ${id}...`);
        outputFiles[id] = await ytmp3.singleDownload(`https://youtu.be/${id}`, {
          outDir,
          convertAudio: false,
          quiet: false
        });

        assert.ok(fs.existsSync(outputFiles[id]));
      }
    });

    it('Download YouTube videos using batch download', async function () {
      consoleLogStub(path.basename(tempFile));
      this.timeout(1000 * 60 * 15);  // Give 15 minutes before timeout
      this.slow(1000 * 60 * 5);      // 5 minutes

      await ytmp3.batchDownload(tempFile, {
        outDir,
        convertAudio: false,
        quiet: false
      });
    });

    it('Download a YouTube video with ID only using `downloadFromID`', async function () {
      this.timeout(1000 * 60 * 13);  // Give 13 minutes before timeout
      this.slow(1000 * 60 * 5);      // 5 minutes

      consoleLogStub('Picking a random video ID from the list...');
      const id = videoIDs[randomInt(0, videoIDs.length - 1)];  // Pick a random ID from the list
      consoleLogStub(`Downloading ${id}...`);
      await ytmp3.downloadFromID(id, {
        outDir,
        convertAudio: false,
        quiet: false
      });
    });
  });

  describe('[CONVERT]', function () {
    const testDynMessages = [
      'should convert audio file to MP3 format with sample rate of 48kHz',
      'should convert audio file to OPUS format with audio channel set to mono',
      'should convert audio file to AAC format with bit rate 320kbps and remove original file'
    ];
    const testMessages = [
      'should reject when the output format is not specified which is mandatory',
      'should handle the error that occurs while logging error'
    ];
    const optionsList = [
      {
        format: 'mp3',
        codec: 'libmp3lame',
        frequency: 48000,
        quiet: false
      },
      {
        format: 'opus',
        codec: 'libopus',
        channels: 1,
        quiet: false
      },
      {
        format: 'aac',
        bitrate: 320,
        inputOptions: 'testing only! this invalid options will be auto-removed',
        outputOptions: '-b:a 320k -f mp4 -acodec aac',
        quiet: false,
        deleteOld: true
      }
    ];
    const audioOutputDir = path.join(outDir, 'irl__audio-conversion-test');
    const audioFile = getAudioFile('testaudio-160-pcm_s32le.wav');

    function getOutFile(inFile, outExt) {
      return path.join(
        outDir, path.basename(audioOutputDir),
        path.basename(inFile).replace(path.extname(inFile), outExt)
      );
    }

    async function moveOutFile(destFile) {
      const outputFileOld = path.join(
        path.dirname(audioFile), path.basename(destFile)
      );
      await fs.promises.copyFile(outputFileOld, destFile);
      await fs.promises.unlink(outputFileOld);
    }

    // Create output directory, if not exist
    utils.createDirIfNotExistSync(audioOutputDir);

    optionsList.forEach(function (options, idx) {
      it(testDynMessages[idx], async function () {
        this.timeout(1000 * 60 * 5);  // 5 minutes
        this.slow(1000 * 60 * 2);     // 2 minutes

        let outputFile;
        let newAudioFile;

        if (idx !== 2) {
          await audioconv.convertAudio(audioFile, options);
          outputFile = getOutFile(audioFile, `.${options.format}`);
          await moveOutFile(outputFile);
        } else {
          newAudioFile = path.join(audioOutputDir, path.basename(audioFile));
          // Duplicate the original audio file to temporary working directory,
          // this is intended to make sure that the original file does not get
          // deleted after conversion due to `deleteOld` option is enabled.
          // Thus, only the duplicate of original file that would be deleted instead
          await fs.promises.copyFile(audioFile, newAudioFile);
          await audioconv.convertAudio(newAudioFile, options);
          outputFile = getOutFile(newAudioFile, `.${options.format}`);
        }

        assert.ok(fs.existsSync(outputFile));
        const {
          streams: inStreams,
          format: inFormat
        } = await ffprobe(audioFile);
        const {
          streams: outStreams,
          format: outFormat
        } = await ffprobe(outputFile);

        // Duration test
        assert.strictEqual(
          outStreams[0].duration.toFixed(),
          inStreams[0].duration.toFixed()
        );
        // File size test
        assert.notStrictEqual(outFormat.size, inFormat.size);
        assert.strictEqual(outFormat.size, (await fs.promises.stat(outputFile)).size);
        // Codec name test
        assert.strictEqual(outStreams[0].codec_name, options.format);

        if (idx === 0) {
          // Channels test
          assert.strictEqual(parseInt(outStreams[0].channels), inStreams[0].channels);
          // Audio resampling test
          assert.strictEqual(parseInt(outStreams[0].sample_rate), options.frequency);
        } else if (idx === 1) {
          // Audio channels test
          assert.strictEqual(parseInt(outStreams[0].channels), options.channels);
        } else if (idx === 2) {
          // Bit rate test
          assert.ok(parseInt(outStreams[0].bit_rate) / 1000 <= options.bitrate);
          assert.equal(fs.existsSync(newAudioFile), false);
        }
      });
    });

    it(testMessages[0], async function () {
      this.slow(800);
      await assert.rejects(() => {
        return audioconv.convertAudio(audioFile, {});
      }, { message: /format .+ not available/i });
    });

    it(testMessages[1], function (done) {
      this.slow(600);

      const createWriteStreamStub = fs.createWriteStream;
      let hasError;
      fs.createWriteStream = (f, o) => {
        const stream = createWriteStreamStub(f, o);
        // Emit error at next tick
        process.nextTick(() => {
          if (!hasError) {
            stream.emit('error', new Error('Simulated error test'));
          }
        });
        return stream;
      };

      assert.rejects(async () => {
        return await audioconv.convertAudio(audioFile, {})
          .catch((err) => {
            assert.ok(err instanceof Error
                      && !(err instanceof assert.AssertionError));
            assert.ok(err.cause instanceof Error);
            assert.match(err.cause.message, /simulated error test/i);
          })
          .finally(() => {
            fs.createWriteStream = createWriteStreamStub;
            done();
          });
        });
    });

    after(async function () {
      const emptyAudioFiles = (await fs.promises.readdir(AUDIO_ASSETS_DIR))
        .map((file) => path.join(AUDIO_ASSETS_DIR, file))
        .filter((file) => {
          return (fs.statSync(file).size === 0);
        });
      // Remove empty audio files in audio assets directory,
      // error occurred during conversion may create an empty file
      for (const file of emptyAudioFiles) await fs.promises.unlink(file);
    });
  });

  after(function () {
    // Clean up temporary working directory
    if (fs.existsSync(outDir)) fs.rmSync(path.dirname(outDir), { recursive: true });
    console.log = consoleLogStub;
    console.error = consoleErrorStub;
  });
});
