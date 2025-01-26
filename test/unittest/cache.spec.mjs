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
const { InvalidTypeError, IDValidationError, CacheValidationError } = error;

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
      'should retrieve cached video information',
      'should retrieve all caches',
      'should throw InvalidTypeError for invalid video info object',
      'should throw InvalidTypeError for invalid cache options type',
      'should throw InvalidTypeError for invalid video ID type',
      'should throw InvalidTypeError for invalid cache directory type',
      'should throw IDValidationError for invalid video ID',
      'should able to create a simple human-readable string of the cache object',
      'should validate cache object when cacheOptions.validate is true',
      'should delete a stored cache with the given ID',
      'should return false if the cache deletion is unsuccessful due to non-existent cache',
      'should able to overwrite the existing cache file if `cacheOptions.force` enabled'
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
  let testVideoId;
  let tempCacheDir;

  before(async function () {
    testVideoId = testVideoInfo.videoDetails.videoId;
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
    let invalidIdCache, invalidCachePath;

    before(async function () {
      invalidIdCache = '12345abcd_-';
      invalidCachePath = path.join(tempCacheDir, 'invalidCache');

      await fs.promises.mkdir(invalidCachePath);
      await fs.promises.writeFile(path.join(invalidCachePath, invalidIdCache), JSON.stringify({
        id: invalidIdCache, encoding: 'binary', videoInfo: { type: 'invalid/type', data: null }
      }));
    });

    it(testMessages.VInfoCache[0], async function () {
      const cachePath = await VInfoCache.createCache(testVideoInfo, tempCacheDir);
      assert.ok(fs.existsSync(cachePath));
    });

    it(testMessages.VInfoCache[1], async function () {
      const cachedInfo = await VInfoCache.getCache(testVideoId, tempCacheDir);
      assert.strictEqual(cachedInfo.id, testVideoId);
    });

    it(testMessages.VInfoCache[2], async function () {
      const allCaches = await VInfoCache.getAllCaches(tempCacheDir);
      assert.ok(Array.isArray(allCaches));
      assert.ok(allCaches.length > 0);
      assert.ok(allCaches.some(cache => cache.id === testVideoId));
    });

    it(testMessages.VInfoCache[3], async function () {
      await assert.rejects(async () => {
        await VInfoCache.createCache('invalid video info', tempCacheDir);
      }, InvalidTypeError);
    });

    it(testMessages.VInfoCache[4], async function () {
      await assert.rejects(async () => {
        await VInfoCache.createCache(testVideoInfo, 123);
      }, InvalidTypeError);
      await assert.rejects(async () => {
        await VInfoCache.getCache(testVideoId, 123);
      }, InvalidTypeError);
      await assert.rejects(async () => {
        await VInfoCache.deleteCache(testVideoId, 123);
      }, InvalidTypeError);
    });

    it(testMessages.VInfoCache[5], async function () {
      await assert.rejects(async () => {
        await VInfoCache.getCache(123, tempCacheDir);
      }, InvalidTypeError);
    });

    it(testMessages.VInfoCache[6], async function () {
      await assert.rejects(async () => {
        await VInfoCache.getAllCaches(0b11111);
      }, InvalidTypeError);
    });

    it(testMessages.VInfoCache[7], async function () {
      await assert.rejects(async () => {
        await VInfoCache.getCache('123', tempCacheDir);
      }, IDValidationError);
    });

    it(testMessages.VInfoCache[8], async function () {
      const actualCache = await VInfoCache.getCache(testVideoId, {
        cacheDir: tempCacheDir,
        humanReadable: true
      });
      const actualAllCaches = await VInfoCache.getAllCaches({
        cacheDir: tempCacheDir,
        humanReadable: true
      });
      assert.strictEqual(typeof actualCache, 'string');
      assert.strictEqual(typeof actualAllCaches, 'string');
      assert.ok(actualCache.includes(testVideoId));
      assert.ok(actualAllCaches.includes(actualCache));
    });

    it(testMessages.VInfoCache[9], async function () {
      // Will not reject if the given cache object is valid
      await assert.doesNotReject(async () => {
        await VInfoCache.getCache(testVideoId, {
          cacheDir: tempCacheDir,
          validate: true
        });
      }, CacheValidationError);
      // Will reject if the given cache object is invalid
      await assert.rejects(async () => {
        await VInfoCache.getAllCaches({ cacheDir: invalidCachePath, validate: true });
      }, CacheValidationError);
    });

    it(testMessages.VInfoCache[10], async function () {
      // Create a copy of temporary cache
      const copiedCache = path.join(tempCacheDir, '01', testVideoId);
      await utils.createDirIfNotExist(path.dirname(copiedCache));
      await fs.promises.cp(path.join(tempCacheDir, testVideoId), copiedCache);

      // Delete the cache
      await assert.doesNotReject(async () => {
        assert.ok(await VInfoCache.deleteCache(testVideoId, {
          cacheDir: path.dirname(copiedCache)
        }));
      });
      assert.strictEqual(fs.existsSync(copiedCache), false);
    });

    it(testMessages.VInfoCache[11], async function () {
      await assert.doesNotReject(async () => {
        assert.strictEqual(await VInfoCache.deleteCache('non_existID', {
          cacheDir: tempCacheDir
        }), false);
      });
    });

    it(testMessages.VInfoCache[12], async function () {
      // Get the cache before update
      const cache = await VInfoCache.getCache(testVideoId, {
        cacheDir: tempCacheDir
      });

      // Update the cache file
      await VInfoCache.createCache(testVideoInfo, {
        cacheDir: tempCacheDir,
        force: true  // enable the force creation (e.g., overwrite)
      });
      // Get the updated version of cache
      const cacheUpdated = await VInfoCache.getCache(testVideoId, {
        cacheDir: tempCacheDir
      });

      // The ID will still be the same
      assert.strictEqual(cache.id, cacheUpdated.id);
      // ... but not for the `createdDate` timestamp
      assert.notStrictEqual(cache.createdDate, cacheUpdated.createdDate);
    });
  });

  after(function () {
    if (fs.existsSync(tempCacheDir)) {
      fs.rmSync(path.dirname(tempCacheDir), { recursive: true });
    }
  });
});
