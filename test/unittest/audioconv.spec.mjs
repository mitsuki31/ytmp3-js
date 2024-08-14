import assert from 'node:assert';
import { spawn } from 'node:child_process';

import audioconv from '../../lib/audioconv.js';

describe('module:audioconv', function () {
  const testMessages = {
    checkFfmpeg: [
      'check whether ffmpeg are installed on system'
    ],
    resolveOptions: [
      'should return default options if given argument is nullable value',
      'should return nullable options if given argument is nullable value',
      'should resolve the given configuration options'
    ]
  };
  let hasFfmpeg = false;

  before(async function () {
    try {
      const { status } = await spawn('ffmpeg -version', { shell: true });
      hasFfmpeg = !status;  // true if zero, false otherwise
    // eslint-disable-next-line no-unused-vars
    } catch (_err) {
      hasFfmpeg = false;
    }
  });

  describe('#checkFfmpeg', function () {
    it(testMessages.checkFfmpeg[0], async function () {
      assert.equal(await audioconv.checkFfmpeg(false), hasFfmpeg);
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
      const actualOptions = [null, undefined, {}].map((val) => {
        return audioconv.resolveOptions(val , true);
      });

      actualOptions.forEach((actual) => {
        assert.notStrictEqual(actual, null);  // Non-nullable
        assert.notStrictEqual(typeof actual, 'undefined');
        assert.deepStrictEqual(actual, expectedOptions[0]);
        assert.notDeepStrictEqual(actual, expectedOptions[2]);
      });
      actualOptions.toReversed().forEach((actual1) => {
        actualOptions.forEach((actual2) => {
          assert.deepStrictEqual(actual1, actual2);
        });
      });
    });

    it(testMessages.resolveOptions[1], function () {
      const actualOptions = [null, undefined, {}].map((val) => {
        return audioconv.resolveOptions(val , false);
      });

      actualOptions.forEach((actual) => {
        assert.notStrictEqual(actual, null);  // Non-nullable
        assert.notStrictEqual(typeof actual, 'undefined');
        assert.notDeepStrictEqual(actual, expectedOptions[0]);
        assert.deepStrictEqual(actual, expectedOptions[2]);
      });
      actualOptions.toReversed().forEach((actual1) => {
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
