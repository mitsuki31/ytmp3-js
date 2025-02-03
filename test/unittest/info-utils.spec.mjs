import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { MIMEType, MIMEParams } from 'node:util';

import info from '../../lib/utils/info-utils.js';
import TypeUtils from '../../lib/utils/type-utils.js';
import utils from '../../lib/utils/index.js';
import error from '../../lib/error.js';
const { FormatUtils, DateFormatter, InfoUtils } = info;
const { getType } = TypeUtils;
const { InvalidTypeError } = error;

const TEST_ASSETS = path.join(utils.ROOTDIR, 'test', 'assets');

describe('module:format-utils', function () {
  const FORMATS = {};  // Store the format objects
  let formatsPath;

  before(async function () {
    formatsPath = path.join(TEST_ASSETS, 'json', 'formats.json');

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

describe('module:info-utils', function () {
  let VIDEO_INFO;

  before(async function () {
    VIDEO_INFO = JSON.parse(
      await fs.promises.readFile(path.join(TEST_ASSETS, 'json', 'videoInfo.json')));
  });

  describe('~InfoUtils', function () {
    const testMessages = {
      getAuthor: [
        'should extract and normalize author information from video info object',
        'should throw an InvalidTypeError if the input is not an object'
      ],
      getTitle: [
        'should extract and return the title of the video',
        'should return null if the title is not available',
        'should throw an InvalidTypeError if the input is not an object'
      ],
      getDuration: [
        'should extract and return the duration of the video in seconds',
        'should return 0 if the duration is not available',
        'should throw an InvalidTypeError if the input is not an object'
      ],
      getUploadDate: [
        'should extract and return the upload date of the video',
        'should return null if the upload date is not available',
        'should throw an InvalidTypeError if the input is not an object'
      ],
      getPublishDate: [
        'should extract and return the publish date of the video',
        'should return null if the publish date is not available',
        'should throw an InvalidTypeError if the input is not an object'
      ],
      getViewers: [
        'should extract and return the view count of the video',
        'should return null if the view count is not available',
        'should throw an InvalidTypeError if the input is not an object'
      ],
      getLikes: [
        'should extract and return the like count of the video',
        'should return null if the like count is not available',
        'should throw an InvalidTypeError if the input is not an object'
      ],
      getSubscribers: [
        'should extract and return the subscriber count of the video\'s author',
        'should return null if the subscriber count is not available',
        'should throw an InvalidTypeError if the input is not an object'
      ],
      getDescription: [
        'should extract and return the description of the video',
        'should return null if the description is not available',
        'should throw an InvalidTypeError if the input is not an object'
      ],
      getKeywords: [
        'should extract and return the keywords of the video',
        'should return an empty array if the keywords are not available',
        'should throw an InvalidTypeError if the input is not an object'
      ],
      getFormats: [
        'should extract and return the available formats of the video',
        'should throw a InvalidTypeError if the input is not an object',
        'should throw a InvalidTypeError if the given filter type is an unexpected value'
      ],
      getCategory: [
        'should extract and return the category of the video',
        'should return null if the category is not available',
        'should throw an InvalidTypeError if the input is not an object'
      ],
      getCaptions: [
        'should extract and return the available captions of the video',
        'should return an empty array if the captions are not available',
        'should throw an InvalidTypeError if the input is not an object'
      ],
      isPrivate: [
        'should return true if the video content is private',
        'should return false if the video content is not private',
        'should throw an InvalidTypeError if the input is not an object'
      ],
      isAgeRestricted: [
        'should return true if the video content is age restricted',
        'should return false if the video content is not age restricted',
        'should throw an InvalidTypeError if the input is not an object'
      ]
    };

    describe('.getAuthor', function () {
      it(testMessages.getAuthor[0], function () {
        const author = InfoUtils.getAuthor(VIDEO_INFO);
        const expectedAuthor = VIDEO_INFO.videoDetails.author;
        const toHttps = url => url.replace(/^http:/, 'https:');  // Change URL protocol from HTTP to HTTPS

        assert.strictEqual(author.name, expectedAuthor.name.replace(' - Topic', ''));
        assert.strictEqual(author.id, expectedAuthor.id);
        assert.strictEqual(author.userUrl, toHttps(expectedAuthor.user_url));
        assert.strictEqual(author.channelUrl, toHttps(expectedAuthor.channel_url));
        assert.strictEqual(author.externalChannelUrl, toHttps(expectedAuthor.external_channel_url));
        assert.strictEqual(author.username, expectedAuthor.user);
        assert.strictEqual(author.verified, expectedAuthor.verified);
        assert.strictEqual(author.subscriberCount, expectedAuthor.subscriber_count);
      });

      it(testMessages.getAuthor[1], function () {
        assert.throws(() => InfoUtils.getAuthor('not an object'), InvalidTypeError);
      });
    });

    describe('.getTitle', function () {
      it(testMessages.getTitle[0], function () {
        assert.strictEqual(InfoUtils.getTitle(VIDEO_INFO), VIDEO_INFO.videoDetails.title);
      });

      it(testMessages.getTitle[1], function () {
        assert.strictEqual(InfoUtils.getTitle({}), null);
      });

      it(testMessages.getTitle[2], function () {
        assert.throws(() => InfoUtils.getTitle(100), InvalidTypeError);
      });
    });
    
    describe('.getDuration', function () {
      it(testMessages.getDuration[0], function () {
        assert.strictEqual(
          InfoUtils.getDuration(VIDEO_INFO),
          parseInt(VIDEO_INFO.videoDetails.lengthSeconds, 10)
        );
      });

      it(testMessages.getDuration[1], function () {
        const duration = InfoUtils.getDuration({});
        assert.strictEqual(typeof duration, 'number');  // Always a number
        assert.strictEqual(duration, 0);
      });

      it(testMessages.getDuration[2], function () {
        assert.throws(() => InfoUtils.getDuration(100), InvalidTypeError);
      });
    });

    describe('.getUploadDate', function () {
      it(testMessages.getUploadDate[0], function () {
        assert.strictEqual(
          InfoUtils.getUploadDate(VIDEO_INFO), VIDEO_INFO.videoDetails.uploadDate);
      });

      it(testMessages.getUploadDate[1], function () {
        assert.strictEqual(InfoUtils.getUploadDate({}), null);
      });

      it(testMessages.getUploadDate[2], function () {
        assert.throws(() => InfoUtils.getUploadDate([]), InvalidTypeError);
      });
    });

    describe('.getPublishDate', function () {
      it(testMessages.getPublishDate[0], function () {
        assert.strictEqual(
          InfoUtils.getPublishDate(VIDEO_INFO), VIDEO_INFO.videoDetails.publishDate);
      });

      it(testMessages.getPublishDate[1], function () {
        assert.strictEqual(InfoUtils.getPublishDate({}), null);
      });

      it(testMessages.getPublishDate[2], function () {
        assert.throws(() => InfoUtils.getPublishDate([]), InvalidTypeError);
      });
    });

    describe('.getViewers|.getViews', function () {
      it(testMessages.getViewers[0], function () {
        assert.strictEqual(
          InfoUtils.getViewers(VIDEO_INFO),
          parseInt(VIDEO_INFO.videoDetails.viewCount, 10)
        );
        assert.strictEqual(
          InfoUtils.getViews(VIDEO_INFO),
          parseInt(VIDEO_INFO.videoDetails.viewCount, 10)
        );
      });

      it(testMessages.getViewers[1], function () {
        assert.strictEqual(InfoUtils.getViewers({}), null);
        assert.strictEqual(InfoUtils.getViews({}), null);
      });

      it(testMessages.getViewers[2], function () {
        assert.throws(() => InfoUtils.getViewers(0), InvalidTypeError);
      });
    });

    describe('.getLikes', function () {
      it(testMessages.getLikes[0], function () {
        assert.strictEqual(
          InfoUtils.getLikes(VIDEO_INFO),
          VIDEO_INFO.videoDetails.likes
        );
      });

      it(testMessages.getLikes[1], function () {
        assert.strictEqual(InfoUtils.getLikes({}), null);
      });
    });

    describe('.getSubscribers|.getSubs', function () {
      it(testMessages.getSubscribers[0], function () {
        assert.strictEqual(
          InfoUtils.getSubscribers(VIDEO_INFO),
          VIDEO_INFO.videoDetails.author.subscriber_count
        );
        assert.strictEqual(
          InfoUtils.getSubs(VIDEO_INFO),
          VIDEO_INFO.videoDetails.author.subscriber_count
        );
      });

      it(testMessages.getSubscribers[1], function () {
        assert.strictEqual(InfoUtils.getSubscribers({}), null);
        assert.strictEqual(InfoUtils.getSubs({}), null);
      });

      it(testMessages.getSubscribers[2], function () {
        assert.throws(() => InfoUtils.getSubscribers(true), InvalidTypeError);
      });
    });

    describe('.getDescription', function () {
      it(testMessages.getDescription[0], function () {
        const description = InfoUtils.getDescription(VIDEO_INFO);
        assert.strictEqual(description, 'Video description.');
      });

      it(testMessages.getDescription[1], function () {
        const description = InfoUtils.getDescription({});
        assert.strictEqual(description, null);
      });

      it(testMessages.getDescription[2], function () {
        assert.throws(() => InfoUtils.getDescription(''), InvalidTypeError);
      });
    });

    describe('.getKeywords', function () {
      it(testMessages.getKeywords[0], function () {
        const keywords = InfoUtils.getKeywords(VIDEO_INFO);
        assert.deepStrictEqual(keywords, ['keyword1', 'keyword2']);
      });

      it(testMessages.getKeywords[1], function () {
        const keywords = InfoUtils.getKeywords({});
        assert.deepStrictEqual(keywords, []);
      });

      it(testMessages.getKeywords[2], function () {
        assert.throws(() => InfoUtils.getKeywords(0), InvalidTypeError);
      });
    });

    describe('.getFormats', function () {
      it(testMessages.getFormats[0], function () {
        const formats = InfoUtils.getFormats(VIDEO_INFO);
        assert.ok(Array.isArray(formats));
        assert.strictEqual(formats.length, 3);
      });

      it(testMessages.getFormats[1], function () {
        assert.throws(() => InfoUtils.getFormats('not an object'), InvalidTypeError);
        assert.throws(() => InfoUtils.getFormats(VIDEO_INFO, 'invalid filter'), InvalidTypeError);
      });

      it(testMessages.getFormats[2], function () {
        assert.throws(() => InfoUtils.getFormats(VIDEO_INFO, 'invalid filter'), InvalidTypeError);
      });
    });

    describe('.getCategory', function () {
      it(testMessages.getCategory[0], function () {
        assert.strictEqual(
          InfoUtils.getCategory(VIDEO_INFO), VIDEO_INFO.videoDetails.category);
      });

      it(testMessages.getCategory[1], function () {
        assert.strictEqual(InfoUtils.getCategory({}), null);
      });
    });

    describe('.getCaptions', function () {
      it(testMessages.getCaptions[0], function () {
        const captions = InfoUtils.getCaptions(VIDEO_INFO);
        assert.ok(Array.isArray(captions));
        assert.strictEqual(captions.length, 2);
      });

      it(testMessages.getCaptions[1], function () {
        assert.deepStrictEqual(InfoUtils.getCaptions({}), []);
      });
    });

    describe('.isPrivate', function () {
      it(testMessages.isPrivate[0], function () {
        const privateVideoInfo = { ...VIDEO_INFO, videoDetails: { ...VIDEO_INFO.videoDetails, isPrivate: true } };
        assert.strictEqual(InfoUtils.isPrivate(privateVideoInfo), true);
      });

      it(testMessages.isPrivate[1], function () {
        const publicVideoInfo = { ...VIDEO_INFO, videoDetails: { ...VIDEO_INFO.videoDetails, isPrivate: false } };
        assert.strictEqual(InfoUtils.isPrivate(publicVideoInfo), false);
      });

      it(testMessages.isPrivate[2], function () {
        assert.throws(() => InfoUtils.isPrivate('not an object'), InvalidTypeError);
      });
    });

    describe('.isAgeRestricted', function () {
      it(testMessages.isAgeRestricted[0], function () {
        const ageRestrictedVideoInfo = { ...VIDEO_INFO, videoDetails: { ...VIDEO_INFO.videoDetails, age_restricted: true } };
        assert.strictEqual(InfoUtils.isAgeRestricted(ageRestrictedVideoInfo), true);
      });

      it(testMessages.isAgeRestricted[1], function () {
        const nonAgeRestrictedVideoInfo = { ...VIDEO_INFO, videoDetails: { ...VIDEO_INFO.videoDetails, age_restricted: false } };
        assert.strictEqual(InfoUtils.isAgeRestricted(nonAgeRestrictedVideoInfo), false);
      });

      it(testMessages.isAgeRestricted[2], function () {
        assert.throws(() => InfoUtils.isAgeRestricted('not an object'), InvalidTypeError);
      });
    });
  });
});
