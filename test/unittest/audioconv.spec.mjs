import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import childProcess from 'node:child_process';
import { getTempPath } from '@mitsuki31/temppath';

import audioconv from '../../lib/audioconv.js';
import utils from '../../lib/utils.js';

describe('module:audioconv', function () {
  const testMessages = {
    checkFfmpeg: [
      'should return true if the FFMPEG_PATH environment variable is set to ffmpeg binary file',
      'should reject if FFMPEG_PATH environment variable is set to a directory',
      'should return true when succeed manually check ffmpeg using execute method',
      'should return false when failed manually check ffmpeg using execute method'
    ],
    resolveOptions: [
      'should return default options if given argument is nullable value',
      'should return default options if given argument is not an object',
      'should resolve the given configuration options'
    ],
    splitOptions: [
      'should return an empty array if given options is not an array',
      'should return the input array if given options is an array',
      'should resolve the given string representing space-separated options',
      'should remove any option without hyphen as they are treated as invalid options'
    ],
    writeErrorLog: [
      'should write the error log to specified file successfully',
      'should not write the error log when the given file path is not a string',
      'should reject when an error occurs during writing process'
    ],
    createConversionProgress: [
      'should create a progress bar from specified options'
    ],
    convertAudio: [
      'should throw an error when input file does not exist',
      'should reject when ffmpeg has not installed',
      'should pass the pre-setup of ffmpeg chain without any error'
    ]
  };

  describe('#checkFfmpeg', function () {
    this.slow(800);  // 0.8 seconds

    let ffmpegPath;
    let fakeFfmpegPath;
    let consoleLog;
    let consoleError;
    let spawnSyncStub;

    before(async function () {
      ffmpegPath = process.env.FFMPEG_PATH || '';
      fakeFfmpegPath = path.join(
        utils.ROOTDIR, 'tmp',
        (process.platform === 'win32') ? 'ffmpeg.exe' : 'ffmpeg'
      );

      spawnSyncStub = childProcess.spawnSync;
      consoleLog = console.log;
      consoleError = console.error;
      console.log = () => {};
      console.error = () => {};
      process.env.FFMPEG_PATH = '';

      // Create a temporary file as fake ffmpeg binary file
      await utils.createDirIfNotExist(path.dirname(fakeFfmpegPath));
      await fs.promises.writeFile(fakeFfmpegPath, '', { encoding: 'utf8' });
    });

    it(testMessages.checkFfmpeg[0], async function () {
      // Set the FFMPEG_PATH to fake ffmpeg file
      process.env.FFMPEG_PATH = fakeFfmpegPath;
      assert.ok(await audioconv.checkFfmpeg(true));
    });

    it(testMessages.checkFfmpeg[1], async function () {
      process.env.FFMPEG_PATH = utils.ROOTDIR;  // Use root directory
      await assert.rejects(audioconv.checkFfmpeg(true), Error);
    });

    it(testMessages.checkFfmpeg[2], async function () {
      delete process.env.FFMPEG_PATH;  // Ensure it is undeclared
      // Override `child_process.spawnSync`
      childProcess.spawnSync = (command, args) => {
        return { status: 0 };
      };

      assert.ok(await audioconv.checkFfmpeg(true));
    });

    it(testMessages.checkFfmpeg[3], async function () {
      delete process.env.FFMPEG_PATH;  // Ensure it is undeclared
      // Override `child_process.spawnSync`
      childProcess.spawnSync = (command, args) => {
        return { status: 1 };
      };

      assert.equal(await audioconv.checkFfmpeg(true), false);
    });

    after(function () {
      console.log = consoleLog;
      console.error = consoleError;
      childProcess.spawnSync = spawnSyncStub;
      process.env.FFMPEG_PATH = ffmpegPath;

      // Delete the fake ffmpeg binary file
      if (fs.existsSync(fakeFfmpegPath)) fs.rmSync(fakeFfmpegPath);
    });
  });

  describe('#resolveOptions', function () {
    const options = {
      inputOptions: 1n,
      outputOptions: '-b:a 144k -c:a libmp3lame -f -vcodec libx264',
      foo: 'this is foo',
      two: 2,
      deleteOld: false,
      quiet: false
    };
    const expectedOptions = [];

    before(function () {
      expectedOptions.push({
        inputOptions: [],
        outputOptions: [],
        format: 'mp3',
        codec: 'libmp3lame',
        bitrate: 128,
        frequency: 44100,
        channels: 2,
        deleteOld: false,
        quiet: false
      });
      expectedOptions.push(
        Object.keys(expectedOptions[0]).reduce((acc, key) => {
          if (['deleteOld', 'quiet'].includes(key)) {
            acc[key] = false;
          } else if (key === 'outputOptions') {
            acc[key] = [
              '-b:a 144k',
              '-c:a libmp3lame',
              '-f',
              '-vcodec libx264'
            ];
          } else {
            acc[key] = undefined;
          }
          return acc;
        }, {}),
        Object.keys(expectedOptions[0]).reduce((acc, key) => {
          acc[key] = undefined;
          return acc;
        }, {})
      );
    });

    it(testMessages.resolveOptions[0], function () {
      const actualOptions = [null, undefined, false].map((val) => {
        return audioconv.resolveOptions(val , true);
      });

      actualOptions.forEach((actual) => {
        assert.notStrictEqual(actual, null);  // Non-nullable
        assert.notStrictEqual(typeof actual, 'undefined');
        assert.deepStrictEqual(actual, expectedOptions[0]);
        assert.notDeepStrictEqual(actual, expectedOptions[2]);
      });
      [...actualOptions].reverse().forEach((actual1) => {
        actualOptions.forEach((actual2) => {
          assert.deepStrictEqual(actual1, actual2);
        });
      });
    });

    it(testMessages.resolveOptions[1], function () {
      const actualOptions = ['&', /y/, 16n].map((val) => {
        return audioconv.resolveOptions(val , false);
      });

      actualOptions.forEach((actual) => {
        assert.notStrictEqual(actual, null);  // Non-nullable
        assert.notStrictEqual(typeof actual, 'undefined');
        assert.deepStrictEqual(actual, expectedOptions[0]);
        assert.notDeepStrictEqual(actual, expectedOptions[1]);
        assert.notDeepStrictEqual(actual, expectedOptions[2]);
      });
      [...actualOptions].reverse().forEach((actual1) => {
        actualOptions.forEach((actual2) => {
          assert.deepStrictEqual(actual1, actual2);
        });
      });
    });

    it(testMessages.resolveOptions[2], function () {
      const actualOptions = audioconv.resolveOptions(options, false);
      assert.equal(utils.isNullOrUndefined(actualOptions), false);
      assert.notDeepStrictEqual(actualOptions, expectedOptions[0]);
      assert.deepStrictEqual(actualOptions, expectedOptions[1]);
    });
  });

  describe('#splitOptions', function () {
    it(testMessages.splitOptions[0], function () {
      assert.deepStrictEqual(audioconv.splitOptions(['-vcodec libx264']), ['-vcodec libx264']);
    });

    it(testMessages.splitOptions[1], function () {
      assert.deepStrictEqual(audioconv.splitOptions({ foo: true }), []);
    });

    it(testMessages.splitOptions[2], function () {
      assert.deepStrictEqual(
        audioconv.splitOptions('-acodec libopus -c:v libx264 -f'),
        ['-acodec libopus', '-c:v libx264', '-f']
      );
    });

    it(testMessages.splitOptions[3], function () {
      assert.deepStrictEqual(audioconv.splitOptions('hello world'), []);
    });
  });

  describe('#writeErrorLog', function () {
    let logFile, logFileBase;
    // Create a stub for `fs.createWriteStream`
    const createWriteStreamStub = fs.createWriteStream;

    before(function () {
      logFile = getTempPath(utils.LOGDIR, 20) + '.log';
      logFileBase = path.basename(logFile);
    });

    it(testMessages.writeErrorLog[0], async function () {
      await assert.doesNotReject(async () => {
        await audioconv.writeErrorLog(logFileBase, {}, { message: 'test error' });
      }, Error);
      const stat = await fs.promises.stat(logFile);
      const contents = await fs.promises.readFile(logFile);

      assert.ok(stat.isFile());
      assert.notStrictEqual(stat.size, 0);
      // Log contents check
      assert.ok(/^\[ERROR\]<ACONV>/.test(contents));
      assert.ok(/Input Audio: Unknown/.test(contents));
      assert.ok(/File Size: 0\.0 MiB/.test(contents));
    });

    it(testMessages.writeErrorLog[1], async function () {
      const logFilePath = getTempPath(utils.ROOTDIR, 10);
      await assert.doesNotReject(async () => {
        await audioconv.writeErrorLog([ logFilePath ], {}, null);
      });

      assert.equal(fs.existsSync(logFilePath), false);
    });

    it(testMessages.writeErrorLog[2], async function () {
      let hasError;

      // Override `fs.createWriteStream`
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

      await assert.rejects(async () => {
        await audioconv.writeErrorLog(logFileBase, {}, null);
      });
    });

    after(function () {
      if (fs.existsSync(logFile)) fs.rmSync(logFile);
      fs.createWriteStream = createWriteStreamStub;
    });
  });

  describe('#createConversionProgress', function () {
    it(testMessages.createConversionProgress[0], function () {
      const info = {
        percent: 20,
        currentKbps: 2058,
        targetSize: 4502
      };
      const extnames = ['m4a', 'mp3'];
      const pb = audioconv.createConversionProgress(info, extnames);
      assert.ok((new RegExp(`\\(${
        extnames[0].toUpperCase()} >> ${
        extnames[1].toUpperCase()}\\)`
      )).test(pb));
      assert.ok((new RegExp(`${info.percent}%`)).test(pb));
      assert.ok((new RegExp(`${(info.targetSize / 1024).toFixed(2)} MB`)).test(pb));
    });
  });

  describe('#convertAudio', function () {
    const consoleLog = console.log;
    const consoleError = console.error;
    const spawnSyncStub = childProcess.spawnSync;
    const ffmpegPath = process.env.FFMPEG_PATH;
    const PromiseStub = global.Promise;
    let fakeAudioFile;

    before(async function () {
      // Keep the 'quiet' option disabled but these should be mocked
      console.log = () => {};
      console.error = () => {};
      global.Promise = class {
        constructor(fn) {
          setImmediate(() => PromiseStub.resolve());
        }
      };

      fakeAudioFile = path.join(utils.ROOTDIR, 'tmp', 'testaudio-01.wav');
      await utils.createDirIfNotExist(path.dirname(fakeAudioFile));
      await fs.promises.writeFile(fakeAudioFile, '', { encoding: 'utf8' });
    });

    beforeEach(function () {
      childProcess.spawnSync = () => {
        return { status: 0 };
      };
    });

    it(testMessages.convertAudio[0], async function () {
      await assert.rejects(async () => {
        await audioconv.convertAudio('a/b/foo/inexistence file.wav');
      });
    });

    it(testMessages.convertAudio[1], async function () {
      delete process.env.FFMPEG_PATH;
      childProcess.spawnSync = () => { return { status: 1 } };

      await assert.rejects(async () => {
        await audioconv.convertAudio(fakeAudioFile);
      }, Error);
    });

    it(testMessages.convertAudio[2], async function () {
      await audioconv.convertAudio(fakeAudioFile, {
        outputOptions: '-acodec wav'
      });
      await audioconv.convertAudio(fakeAudioFile, {
        outputOptions: []
      });
    });

    after(function () {
      console.log = consoleLog;
      console.error = consoleError;
      childProcess.spawnSync = spawnSyncStub;
      process.env.FFMPEG_PATH = ffmpegPath;
      global.Promise = PromiseStub;

      // Delete the fake audio file
      if (fs.existsSync(fakeAudioFile)) fs.rmSync(fakeAudioFile);
    });
  });
});
