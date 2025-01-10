import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { MIMEType, MIMEParams } from 'node:util';

import fmtUtils from '../../lib/utils/format-utils.js';
import TypeUtils from '../../lib/utils/type-utils.js';
import utils from '../../lib/utils/index.js';
import error from '../../lib/error.js';
const { FormatUtils, DateFormatter } = fmtUtils;
const { getType } = TypeUtils;
const { InvalidTypeError } = error;

describe('module:format-utils', function () {
  const FORMATS = {};  // Store the format objects
  let formatsPath;

  before(async function () {
    const testAssets = path.join(utils.ROOTDIR, 'test', 'assets');
    formatsPath = path.join(testAssets, 'json', 'formats.json');

    // Import and parse the format objects from assets
    Object.assign(FORMATS, JSON.parse(await fs.promises.readFile(formatsPath)));
  });

  describe('.DateFormatter', function () {
    const testMessages = {
      constructor: [
        'should initialize a new instance with input of milliseconds timestamp',
        'should throw a InvalidTypeError if the input is not a number'
      ],
      fromMicroseconds: [
        'should parse and convert microseconds timestamp into milliseconds',
        'should throw a InvalidTypeError if the input is not a number'
      ],
      'toMicroseconds|micros': [
        'should correctly return microseconds timestamp'
      ],
      'toMilliseconds|millis': [
        'should correct return milliseconds timestamp'
      ],
      'toISOString|toISO': [
        'should correctly return a ISO-8601 formatted date string'
      ],
      toDateObject: [
        'should return a Date object and have equals timestamp on both'
      ],
      toString: [
        'should return a human-readable date string'
      ],
      toLocaleString: [
        'should return a date formatted to a specified locale'
      ]
    };

    describe('#constructor', function () {
      it(testMessages.constructor[0], function () {
        assert.doesNotThrow(() => new DateFormatter(Date.now()), Error);
      });

      it(testMessages.constructor[1], function () {
        assert.throws(() => new DateFormatter('a string', InvalidTypeError));
        assert.throws(() => new DateFormatter({}, InvalidTypeError));
      });
    });

    describe('.fromMicroseconds', function () {
      it(testMessages.fromMicroseconds[0], function () {
        // Use timestamp `lastModified` from format objects, because they are microseconds timestamp
        const microsTimestamps = Object.values(FORMATS).map((format) => parseInt(format.lastModified || '0'));
        const millisTimestamps = microsTimestamps.map((t) => DateFormatter.fromMicroseconds(t).millis());
        const expectedTimestamps = microsTimestamps.map((t) => t * 1000);
  
        for (const [actual, expected] of [millisTimestamps, expectedTimestamps]) {
          assert.strictEqual(actual, expected);
        }
      });

      it(testMessages.fromMicroseconds[1], function () {
        assert.throws(() => DateFormatter.fromMicroseconds([]), InvalidTypeError);
      });
    });

    describe('#toMicroseconds|#micros', function () {
      it(testMessages['toMicroseconds|micros'][0], function () {
        const ms = Date.now();  // Store first, because Date.now() will dynamically update itself
        const funcs = ['toMicroseconds', 'micros'];
        const expectedVal = ms * 1000;
        let actualVals = [];

        assert.doesNotThrow(() => {
          actualVals = funcs.map((func) => (new DateFormatter(ms))[func]());
        }, Error);
        assert.strictEqual(actualVals[0], actualVals[1]);
        assert.strictEqual(actualVals[0], expectedVal);
      });
    });

    describe('#toMilliseconds|#millis', function () {
      it(testMessages['toMilliseconds|millis'][0], function () {
        const ms = Date.now() * 1000;  // Store first, because Date.now() will dynamically update itself
        const funcs = ['toMilliseconds', 'millis'];
        const expectedVal = Math.floor(ms / 1000);
        let actualVals = [];

        assert.doesNotThrow(() => {
          actualVals = funcs.map((func) => DateFormatter.fromMicroseconds(ms)[func]());
        }, Error);
        assert.strictEqual(actualVals[0], actualVals[1]);
        assert.strictEqual(actualVals[0], expectedVal);
      });
    });

    describe('#toISOString|#toISO', function () {
      it(testMessages['toISOString|toISO'][0], function () {
        const t = parseInt(FORMATS.combined.lastModified);
        const funcs = ['toISOString', 'toISO'];
        const expectedVal = '2022-04-14T13:00:29.498Z';
        let actualVals = [];

        assert.doesNotThrow(() => {
          actualVals = funcs.map((func) => DateFormatter.fromMicroseconds(t)[func]());
        }, Error);
        assert.strictEqual(actualVals[0], actualVals[1]);
        assert.strictEqual(actualVals[0], expectedVal);
      });
    });

    describe('#toDateObject', function () {
      it(testMessages.toDateObject[0], function () {
        const t = parseInt(FORMATS.videoonly.lastModified);
        const actualObj = DateFormatter.fromMicroseconds(t).toDateObject();
        const expectedObj = new Date(Math.floor(t / 1000));

        assert.strictEqual(actualObj.getTime(), expectedObj.getTime());
        assert.strictEqual(actualObj.toString(), expectedObj.toString());
        assert.strictEqual(actualObj.toISOString(), expectedObj.toISOString());
        assert.strictEqual(actualObj.getTime(), Math.floor(t / 1000));
      });
    });

    describe('#toString', function () {
      it(testMessages.toString[0], function () {
        // This test can be hard to implement, so here we just compare with Date object
        const t = Math.floor(parseInt(FORMATS.audioonly.lastModified) * 1000);
        const actualVal = (new DateFormatter(t)).toString();
        const expectedVal = (new Date(t)).toString();

        assert.strictEqual(actualVal, expectedVal);
      });
    });

    describe('#toLocaleString', function () {
      it(testMessages.toLocaleString[0], function () {
        // This test can be hard to implement, so here we just compare with Date object
        const t = Math.floor(parseInt(FORMATS.audioonly.lastModified) * 1000);
        const locales = ['en-US', 'id-ID', 'ja-JP'];
        const actualVals = locales.map((locale) => (new DateFormatter(t)).toLocaleString(locale));
        const expectedVals = locales.map((locale) => (new Date(t)).toLocaleString(locale));

        for (let i = locales.length; i > 0; i--) {
          assert.strictEqual(actualVals[i], expectedVals[i]);
        }
      });
    });
  });

  describe('~FormatUtils', function () {
    const testMessages = {
      parseFormatObject:[
        'should parse and normalize the YouTube format object',
        'should throw a InvalidTypeError if the input is not an object'
      ],
      hasVideo: [
        'should return true if the format contains video',
        'should return false if the format does not contain video'
      ],
      hasAudio: [
        'should return true if the format contains audio',
        'should return false if the format does not contain audio'
      ]
    };

    describe('.parseFormatObject', function () {
      it(testMessages.parseFormatObject[0], function () {
        const formatKeys = Object.keys(FORMATS);
        const parsedFormats = formatKeys.map((key) => FormatUtils.parseFormatObject(FORMATS[key]));

        parsedFormats.forEach((parsedFormat, index) => {
          const originalFormat = FORMATS[formatKeys[index]];
            for (const [key, value] of Object.entries(parsedFormat)) {
              switch (key) {
                case 'mimeType':  // `mimeType` must be a MIMEType instance
                  assert.ok(value instanceof MIMEType);
                  assert.ok(value.params instanceof MIMEParams);
                  assert.strictEqual(value.toString(), new MIMEType(originalFormat[key]).toString());
                  break;
                case 'initRange':
                case 'indexRange':  // `initRange` and `indexRange` must be a plain object
                  if (getType(value) === 'undefined') continue;  // Recommended to check the availability for several properties
                  assert.ok(TypeUtils.isPlainObject(value));
                  assert.strictEqual(getType(value.start), 'number');
                  assert.strictEqual(getType(value.end), 'number');
                  assert.strictEqual(value.start, parseInt(originalFormat[key].start, 10));
                  assert.strictEqual(value.end, parseInt(originalFormat[key].end, 10));
                  break;
                case 'lastModified':  // `lastModified` must be a DateFormatter instance
                  assert.ok(value instanceof DateFormatter);
                  assert.strictEqual(value.micros(), parseInt(originalFormat[key], 10));
                  break;
                case 'contentLength':
                case 'approxDurationMs':
                case 'audioSampleRate':  // `contentLength`, `approxDurationMs`, and `audioSampleRate` must be a number type
                  if (formatKeys[index] === 'videoonly') continue;  // Pass for format that contain video only
                  assert.strictEqual(getType(value), 'number');
                  assert.strictEqual(value, parseInt(originalFormat[key], 10));
                  break;
              }
            }
        });
      });

      it(testMessages.parseFormatObject[1], function () {
        assert.throws(() => FormatUtils.parseFormatObject('not an object'), InvalidTypeError);
        assert.throws(() => FormatUtils.parseFormatObject(0b001), InvalidTypeError);
        assert.throws(() => FormatUtils.parseFormatObject(() => {}), InvalidTypeError);
      });
    });

    describe('.hasVideo', function () {
      it(testMessages.hasVideo[0], function () {
        const format = FORMATS.videoonly;
        const hasVideo = FormatUtils.hasVideo(format);
        assert.strictEqual(hasVideo, true);
      });

      it(testMessages.hasVideo[1], function () {
        const format = FORMATS.audioonly;
        const hasVideo = FormatUtils.hasVideo(format);
        assert.strictEqual(hasVideo, false);
      });
    });

    describe('.hasAudio', function () {
      it(testMessages.hasAudio[0], function () {
        const format = FORMATS.audioonly;
        const hasAudio = FormatUtils.hasAudio(format);
        assert.strictEqual(hasAudio, true);
      });

      it(testMessages.hasAudio[1], function () {
        const format = FORMATS.videoonly;
        const hasAudio = FormatUtils.hasAudio(format);
        assert.strictEqual(hasAudio, false);
      });
    });
  });
});
