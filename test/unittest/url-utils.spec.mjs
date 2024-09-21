import assert from 'node:assert';

import URLUtils from '../../lib/utils/url-utils.js';
import error from '../../lib/error.js';
const { IDExtractorError } = error;

describe('module:url-utils', function () {
  describe('.URLUtils', function () {
    const testMessages = {
      constructor: [
        'should throw an error when attempt to create new instance'
      ],
      extractVideoId: [
        'should return the video ID of given YouTube URL if it is valid',
        'should throw a `TypeError` if given URL is neither a string or URL object',
        'should throw a `IDExtractorError` if an incorrect YouTube URL are given',
        "should throw a `URIError` if the given URL's domain is not a YouTube domain"
      ],
      validateUrl: [
        'should return true if the given URL is valid',
        "should return false if the given URL's domain name is not a YouTube domain",
        'should return false if the given URL is valid but with invalid video ID',
        'should return true if the given URL is valid but with invalid video ID and `withId` disabled',
        'should throw `TypeError` if the given URL is neither a string or URL object'
      ],
      validateId: [
        'should return true if the given ID is valid',
        'should return false if the given ID is invalid',
        'should throw `TypeError` if the given ID is not a string'
      ]
    };

    describe('#constructor', function () {
      it(testMessages.constructor[0], function () {
        assert.throws(() => URLUtils(), Error);
        assert.throws(() => new URLUtils(), Error);
      });
    });

    describe('#extractVideoId', function () {
      const id = 'abcdeQWERTY';  // Valid video ID always have 11 characters
      let urls;

      before (function () {
        urls = URLUtils.BASIC_YOUTUBE_DOMAINS.map((url) => {
          return new URL((url !== 'youtu.be') ? `watch?v=${id}` : id, `https://${url}`);
        });
      });

      it(testMessages.extractVideoId[0], function () {
        urls.forEach((url) => assert.strictEqual(URLUtils.extractVideoId(url), id));
      });

      it(testMessages.extractVideoId[1], function () {
        assert.throws(() => URLUtils.extractVideoId(123), TypeError);
        assert.throws(() => URLUtils.extractVideoId([]), TypeError);
        assert.throws(() => URLUtils.extractVideoId(true), TypeError);
        assert.throws(() => URLUtils.extractVideoId(0n), TypeError);
        assert.throws(() => URLUtils.extractVideoId(-Infinity), TypeError);
      });

      it(testMessages.extractVideoId[2], function () {
        assert.throws(() => {
          URLUtils.extractVideoId('https://youtu.be/watch?v=abc');
        }, IDExtractorError);
        assert.throws(() => {
          URLUtils.extractVideoId('https://m.youtube.com/channels/UC_12345abcde');
        }, IDExtractorError);
      });

      it(testMessages.extractVideoId[3], function () {
        assert.throws(() => URLUtils.extractVideoId('https://open.spotify.com'), URIError);
      });
    });

    describe('#validateUrl', function () {
      const exampleValidUrl = 'https://m.youtube.com/watch?v=12345-abcde';
      const exampleInvalidUrl = 'https://youtu.be/12-=~56';

      it(testMessages.validateUrl[0], function () {
        assert.ok(URLUtils.validateUrl(exampleValidUrl));
        assert.ok(URLUtils.validateUrl(new URL(exampleValidUrl)));
      });

      it(testMessages.validateUrl[1], function () {
        assert.equal(URLUtils.validateUrl('https://www.google.com/'), false);
        assert.equal(URLUtils.validateUrl(new URL('https://www.google.com/')), false);
      });

      it(testMessages.validateUrl[2], function () {
        assert.equal(URLUtils.validateUrl(exampleInvalidUrl), false);
        assert.equal(URLUtils.validateUrl(new URL(exampleInvalidUrl)), false);
      });

      it(testMessages.validateUrl[3], function () {
        assert.ok(URLUtils.validateUrl(exampleInvalidUrl, false));
        assert.ok(URLUtils.validateUrl(new URL(exampleInvalidUrl), false));
      });

      it(testMessages.validateUrl[4], function () {
        assert.throws(() => URLUtils.validateUrl(123), TypeError);
        assert.throws(() => URLUtils.validateUrl([]), TypeError);
        assert.throws(() => URLUtils.validateUrl(0n), TypeError);
        assert.throws(() => URLUtils.validateUrl(-Infinity), TypeError);
        assert.throws(() => URLUtils.validateUrl(/abc/), TypeError);
      });
    });

    describe('#validateId', function () {
      const exampleValidId = '_1234-zxcvO';  // Valid ID always have 11 characters
      const exampleInvalidId = '123~V_';

      it(testMessages.validateId[0], function () {
        assert.ok(URLUtils.validateId(exampleValidId));
      });

      it(testMessages.validateId[1], function () {
        assert.equal(URLUtils.validateId(exampleInvalidId), false);
      });

      it(testMessages.validateId[2], function () {
        assert.throws(() => URLUtils.validateId(/_ba$/), TypeError);
        assert.throws(() => URLUtils.validateId(0x12345), TypeError);
        assert.throws(() => URLUtils.validateId(999n), TypeError);
        assert.throws(() => URLUtils.validateId(Infinity), TypeError);
        assert.throws(() => URLUtils.validateId({}), TypeError);
      });
    });
  });
});
