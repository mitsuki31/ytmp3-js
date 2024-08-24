import assert from 'node:assert';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import audioconv from '../../lib/audioconv.js';

describe('module:audioconv', function () {
  const testMessages = {
    checkFfmpeg: [
      'check whether ffmpeg are installed on system',
      'should reject if FFMPEG_PATH environment variable is set to a directory'
    ],
    resolveOptions: [
      'should return default options if given argument is nullable value',
      'should return default options if given argument is not an object',
      'should resolve the given configuration options'
    ]
  };
  let hasFfmpeg = false;

  before(function () {
    try {
      const { status } = spawnSync('ffmpeg -version', { shell: true });
      hasFfmpeg = (status === 0);  // Prevent return `true` if null or undefined
    } catch (_err) {
      hasFfmpeg = false;
    }
  });

  describe('#checkFfmpeg', function () {
    this.slow(800);  // 0.8 seconds

    let ffmpegPath;
    let consoleLog = null;
    let consoleError = null;

    before(function () {
      ffmpegPath = process.env.FFMPEG_PATH || '';
      consoleLog = console.log;
      console.log = () => {};
      console.error = () => {};
      process.env.FFMPEG_PATH = '';
    });

    it(testMessages.checkFfmpeg[0], async function () {
      assert.equal(await audioconv.checkFfmpeg(true), hasFfmpeg);
    });

    it(testMessages.checkFfmpeg[1], async function () {
      process.env.FFMPEG_PATH = path.resolve('.');
      await assert.rejects(audioconv.checkFfmpeg(true), Error);
    });

    after(function () {
      console.log = consoleLog;
      console.error = consoleError;
      process.env.FFMPEG_PATH = ffmpegPath;
    });
  });

  describe('#resolveOptions', function () {
    const options = {
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
          acc[key] = ['deleteOld', 'quiet'].includes(key) ? false : undefined;
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
      assert.notStrictEqual(actualOptions, null);
      assert.notStrictEqual(typeof actualOptions, 'undefined');
      assert.notDeepStrictEqual(actualOptions, expectedOptions[0]);
      assert.deepStrictEqual(actualOptions, expectedOptions[1]);
    });
  });
});
