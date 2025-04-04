import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getTempPath } from '@mitsuki31/temppath';

import ytmp3 from '../../lib/ytmp3.js';
import audioconv from '../../lib/audioconv.js';
import utils from '../../lib/utils/index.js';
import error from '../../lib/error.js';
const { InvalidTypeError } = error;
const pkg = JSON.parse(
  fs.readFileSync(path.join(utils.ROOTDIR, 'package.json'), 'utf8'));

describe('module:ytmp3', function () {
  const testMessages = {
    name: [
      'should be a string type',
      'should be match to "ytmp3"'
    ],
    version: [
      'should be a string type',
      'should be match to the version in package.json'
    ],
    version_info: [
      'should be a frozen object',
      'should match with `VERSION` value when assembled as a string',
      'should throw an error (in ESM) when attempting to modify read-only properties'
    ],
    validateYTURL: [
      'should does not throw when given a valid YouTube URL',
      'should accept a URL object representing a valid YouTube URL as input',
      'should throw when given an invalid YouTube URL',
      'should throw when given URL is not a string'
    ],
    resolveDlOptions: [
      'should resolve and validate download options',
      'should throw when download options are not an object'
    ],
    writeErrorLog: [
      'should write the error to specified file successfully',
      'should not create a log file when the given file path is not a string'
    ]
  };

  describe('.name', function () {
    it(testMessages.name[0], function () {
      assert.strictEqual(typeof ytmp3.name, 'string');
    });

    it(testMessages.name[1], function () {
      assert.strictEqual(ytmp3.name, 'ytmp3');
    });
  });

  describe('.version', function () {
    it(testMessages.version[0], function () {
      assert.strictEqual(typeof ytmp3.version, 'string');
    });

    it(testMessages.version[1], function () {
      assert.strictEqual(ytmp3.version, pkg.version);
    });
  });

  describe('.version_info', function () {
    it(testMessages.version_info[0], function () {
      assert.ok(utils.isObject(ytmp3.version_info));
      assert.ok(Object.isFrozen(ytmp3.version_info));
    });

    it(testMessages.version_info[1], function () {
      const versionStr = Object.values(ytmp3.version_info).reduce((acc, val) => {
        acc += (typeof val !== 'number' && val.toLowerCase() === 'beta')
          ? `-${val}`
          : (val !== 'stable') ? ((!acc) ? val : `.${val}`) : '';
        return acc;
      }, '');
      assert.strictEqual(versionStr, ytmp3.version);
    });

    it(testMessages.version_info[2], function () {
      // Attempt to modify the property value
      assert.throws(() => ytmp3.version_info.major = Infinity, {
        message: /cannot assign/i
      });
    });
  });

  describe('#validateYTURL', function () {
    let consoleLog = null;
    let consoleError = null;

    before(function () {
      // These was intended to suppress `console.log` and
      // `console.error` logs during tests when verbose mode is enabled
      consoleLog = console.log;
      consoleError = console.error;
      console.log = () => {};
      console.error = () => {};
    });

    it(testMessages.validateYTURL[0], function () {
      // Valid YouTube URLs must have an ID with length of 11 characters
      assert.doesNotThrow(() => ytmp3.validateYTURL('https://youtu.be/Z0z5mNPODrc', true), Error);
    });

    it(testMessages.validateYTURL[1], function () {
      assert.doesNotThrow(() => ytmp3.validateYTURL(
        new URL('Z0z5mNPODrc', 'https://youtu.be'), true),
        Error
      );
    });

    it(testMessages.validateYTURL[2], function () {
      assert.throws(() => ytmp3.validateYTURL('https://open.spotify.com', true), Error);
    });

    it(testMessages.validateYTURL[3], function () {
      assert.throws(() => ytmp3.validateYTURL(123, true), InvalidTypeError);
      assert.throws(() => ytmp3.validateYTURL([], true), InvalidTypeError);
    });

    after(function () {
      console.log = consoleLog;
      console.error = consoleError;
    });
  });

  describe('#resolveDlOptions', function () {
    it(testMessages.resolveDlOptions[0], function () {
      const downloadOptions = {
        outDir: 'tmp/downloads',
        quiet: true
      };
      const expectedDownloadOptions = {
        cwd: path.resolve('.'),
        outDir: path.resolve('.', 'tmp', 'downloads'),
        convertAudio: true,
        converterOptions: audioconv.defaultOptions,
        quiet: true,
        useCache: true
      };
      const actualOptions = ytmp3.resolveDlOptions({ downloadOptions });
      assert.deepStrictEqual(actualOptions, expectedDownloadOptions);
    });
  });

  describe('#writeErrorLog', function () {
    let logFile, logFileBase;
    const exampleVideoData = {
      title: 'test',
      author: 'Test Foo',
      channelId: 'testFoo-channelid',
      videoUrl: 'https://example.com',
      viewers: 0
    };

    before(function () {
      logFile = getTempPath(utils.LOGDIR) + '.log';
      logFileBase = path.basename(logFile);
    });

    it(testMessages.writeErrorLog[0], async function () {
      this.slow(700);

      const result = await ytmp3.writeErrorLog(logFileBase, exampleVideoData, { message: 'test' });
      const stat = await fs.promises.stat(logFile);

      assert.ok(result);
      assert.ok(fs.existsSync(logFile));
      assert.notStrictEqual(stat.size, 0);
      assert.notStrictEqual(fs.readFileSync(logFile, { encoding: 'utf8' }).length, 0);
    });

    it(testMessages.writeErrorLog[1], async function () {
      assert.equal(await ytmp3.writeErrorLog(12345, exampleVideoData, { message: 'test' }), false);
      assert.equal(fs.existsSync(path.join(path.dirname(logFile), '12345')), false);
    });

    after(function () {
      // Clean the temporary log file
      if (fs.existsSync(logFile)) fs.rmSync(logFile);
    });
  });
});
