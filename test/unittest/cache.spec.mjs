import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getTempPath } from '@mitsuki31/temppath';

import {
  CACHE_KEYS,
  VINFO_CACHE_PATH,
  getCachePath,
  CacheBase64,
  CacheZLib,
  VInfoCache
} from '../../lib/cache.js';
import utils from '../../lib/utils/index.js';
import error from '../../lib/error.js';
const { InvalidTypeError, IDValidationError } = error;

describe('module:cache', function () {
  const testMessages = {
    getCachePath: 'should return the correct cache path for a given video ID',
    CacheBase64: [
      'should encode an object to a Base64 string',
      'should decode a Base64 string to an object'
    ],
    CacheZLib: [
      'should compress an object using zlib',
      'should decompress a zlib compressed object',
      'should throw InvalidTypeError for invalid deflated object type'
    ],
    VInfoCache: [
      'should create a cache for video information',
      'should check if a cache exists and is valid',
      'should retrieve cached video information',
      'should retrieve all caches',
      'should throw InvalidTypeError for invalid video info object',
      'should throw InvalidTypeError for invalid cache options type',
      'should throw InvalidTypeError for invalid video ID type',
      'should throw InvalidTypeError for invalid cache directory type',
      'should throw IDValidationError for invalid video ID',
      'should able to create a simple human-readable string of the cache object'
    ]
  };

  const testVideoInfo = {
    videoDetails: {
      videoId: 'abcdef12345',
      title: 'Example Video',
      author: { name: 'Author Name' },
      ownerProfileUrl: 'https://example.com'
    }
  };
  const testVideoId = testVideoInfo.videoDetails.videoId;
  let tempCacheDir;

  before(async function () {
    tempCacheDir = getTempPath(path.join(utils.ROOTDIR, 'tmp', 'cache'));
    await utils.createDirIfNotExist(tempCacheDir);
  });

  describe('#getCachePath', function () {
    it(testMessages.getCachePath, function () {
      const expectedPath = path.join(VINFO_CACHE_PATH, testVideoId);
      assert.strictEqual(getCachePath(testVideoId), expectedPath);
    });
  });

  describe('CacheBase64', function () {
    it(testMessages.CacheBase64[0], function () {
      const obj = { key: 'value' };
      const encoded = CacheBase64.encodeCacheObject(obj);
      const expected = Buffer.from(JSON.stringify(obj)).toString('base64');
      assert.strictEqual(encoded, expected);
    });

    it(testMessages.CacheBase64[1], function () {
      const obj = { key: 'value' };
      const encoded = Buffer.from(JSON.stringify(obj)).toString('base64');
      const decoded = CacheBase64.decodeCacheObject(encoded);
      assert.deepStrictEqual(decoded, obj);
    });
  });

  describe('CacheZLib', function () {
    it(testMessages.CacheZLib[0], async function () {
      const obj = { key: 'value' };
      const compressed = await CacheZLib.deflateCacheObject(obj);
      assert.ok(Buffer.isBuffer(compressed));
    });

    it(testMessages.CacheZLib[1], async function () {
      const obj = { key: 'value' };
      const compressed = await CacheZLib.deflateCacheObject(obj);
      const deflatedObj = { type: CACHE_KEYS.videoInfo.type, data: compressed.toString(CACHE_KEYS.encoding) };
      const decompressed = await CacheZLib.inflateCacheObject(deflatedObj);
      assert.deepStrictEqual(decompressed, obj);
    });

    it(testMessages.CacheZLib[2], async function () {
      const invalidDeflatedObj = { type: 'invalid/type', data: 'invalid data' };
      await assert.rejects(async () => {
        await CacheZLib.inflateCacheObject(invalidDeflatedObj);
      }, InvalidTypeError);
    });
  });

  describe('VInfoCache', function () {
    it(testMessages.VInfoCache[0], async function () {
      const cachePath = await VInfoCache.createCache(testVideoInfo, tempCacheDir);
      assert.ok(fs.existsSync(cachePath));
    });

    it(testMessages.VInfoCache[1], async function () {
      const cacheExists = await VInfoCache.checkCache(testVideoId, tempCacheDir);
      assert.strictEqual(cacheExists, true);
    });

    it(testMessages.VInfoCache[2], async function () {
      const cachedInfo = await VInfoCache.getCache(testVideoId, tempCacheDir);
      assert.strictEqual(cachedInfo.id, testVideoId);
    });

    it(testMessages.VInfoCache[3], async function () {
      const allCaches = await VInfoCache.getAllCaches(tempCacheDir);
      assert.ok(Array.isArray(allCaches));
      assert.ok(allCaches.length > 0);
      assert.ok(allCaches.some(cache => cache.id === testVideoId));
    });

    it(testMessages.VInfoCache[4], async function () {
      await assert.rejects(async () => {
        await VInfoCache.createCache('invalid video info', tempCacheDir);
      }, InvalidTypeError);
    });

    it(testMessages.VInfoCache[5], async function () {
      await assert.rejects(async () => {
        await VInfoCache.createCache(testVideoInfo, 123);
      }, InvalidTypeError);
      await assert.rejects(async () => {
        await VInfoCache.getCache(testVideoId, 123);
      }, InvalidTypeError);
      await assert.rejects(async () => {
        await VInfoCache.checkCache(testVideoId, 123);
      }, InvalidTypeError);
    });

    it(testMessages.VInfoCache[6], async function () {
      await assert.rejects(async () => {
        await VInfoCache.getCache(123, tempCacheDir);
      }, InvalidTypeError);
      await assert.rejects(async () => {
        await VInfoCache.checkCache(123, tempCacheDir);
      }, InvalidTypeError);
    });

    it(testMessages.VInfoCache[7], async function () {
      await assert.rejects(async () => {
        await VInfoCache.getAllCaches(0b11111);
      }, InvalidTypeError);
    });

    it(testMessages.VInfoCache[8], async function () {
      await assert.rejects(async () => {
        await VInfoCache.getCache('123', tempCacheDir);
      }, IDValidationError);
      await assert.rejects(async () => {
        await VInfoCache.checkCache('123', tempCacheDir);
      }, IDValidationError);
    });

    it(testMessages.VInfoCache[9], async function () {
      const actualCache = await VInfoCache.getCache(testVideoId, {
        cachePath: tempCacheDir,
        humanReadable: true
      });
      const actualAllCaches = await VInfoCache.getAllCaches(tempCacheDir, true);
      assert.strictEqual(typeof actualCache, 'string');
      assert.strictEqual(typeof actualAllCaches, 'string');
      assert.ok(actualCache.includes(testVideoId));
      assert.ok(actualAllCaches.includes(actualCache));
    });
  });

  after(function () {
    if (fs.existsSync(tempCacheDir)) {
      fs.rmSync(path.dirname(tempCacheDir), { recursive: true });
    }
  });
});
