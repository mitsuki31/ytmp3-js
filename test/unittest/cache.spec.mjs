import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getTempPath } from '@mitsuki31/temppath';

import cache from '../../lib/cache.js';
import utils from '../../lib/utils/index.js';
import error from '../../lib/error.js';
const {
  CACHE_KEYS,
  CACHE_EXPIRE_TIME,
  hasExpired,
  getCachePath,
  CacheBase64,
  CacheZLib,
  VInfoCache
} = cache;
const { YTMP3_VINFO_CACHEDIR } = utils;
const { InvalidTypeError, IDValidationError, CacheValidationError } = error;

const testMessages = {
  getCachePath: 'should return the correct cache path for a given video ID',
  CacheBase64: {
    encodeCacheObject: 'should encode an object to a Base64 string',
    decodeCacheObject: 'should decode a Base64 string to an object'
  },
  CacheZLib: {
    deflateCacheObject: 'should compress an object using zlib',
    inflateCacheObject: [
      'should decompress a zlib compressed object',
      'should throw InvalidTypeError for invalid deflated object type'
    ]
  },
  VInfoCache: {
    createCache: [
      'should create a cache for video information',
      'should throw InvalidTypeError for invalid video info object',
      'should throw InvalidTypeError for invalid cache options type',
      'should able to overwrite the existing cache file if `cacheOptions.force` enabled'
    ],
    getCache: [
      'should retrieve cached video information',
      'should throw InvalidTypeError for invalid video ID type',
      'should throw IDValidationError for invalid video ID',
      'should able to create a simple human-readable string of the cache object',
      'should validate cache object when cacheOptions.validate is true'
    ],
    getAllCaches: [
      'should retrieve all caches',
      'should throw InvalidTypeError for invalid cache directory type',
      'should return an empty array or `null` depending on `humanReadable` option when no caches found'
    ],
    deleteCache: [
      'should delete a stored cache with the given ID',
      'should return false if the cache deletion is unsuccessful due to non-existent cache'
    ],
  },
  hasExpired: [
    'should return true if the cache has expired',
    'should return false if the cache has not expired'
  ]
};

describe('module:cache', function () {
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
      const expectedPath = path.join(YTMP3_VINFO_CACHEDIR, testVideoId);
      assert.strictEqual(getCachePath(testVideoId), expectedPath);
    });
  });

  describe('CacheBase64', function () {
    describe('#encodeCacheObject', function () {
      it(testMessages.CacheBase64.encodeCacheObject, function () {
        const obj = { key: 'value' };
        const encoded = CacheBase64.encodeCacheObject(obj);
        const expected = Buffer.from(JSON.stringify(obj)).toString('base64');
        assert.strictEqual(encoded, expected);
      });
    });

    describe('#decodeCacheObject', function () {
      it(testMessages.CacheBase64.decodeCacheObject, function () {
        const obj = { key: 'value' };
        const encoded = Buffer.from(JSON.stringify(obj)).toString('base64');
        const decoded = CacheBase64.decodeCacheObject(encoded);
        assert.deepStrictEqual(decoded, obj);
      });
    });
  });

  describe('CacheZLib', function () {
    describe('#deflateCacheObject', function () {
      it(testMessages.CacheZLib.deflateCacheObject, async function () {
        const obj = { key: 'value' };
        const compressed = await CacheZLib.deflateCacheObject(obj);
        assert.ok(Buffer.isBuffer(compressed));
      });
    });

    describe('#inflateCacheObject', function () {
      it(testMessages.CacheZLib.inflateCacheObject[0], async function () {
        const obj = { key: 'value' };
        const compressed = await CacheZLib.deflateCacheObject(obj);
        const deflatedObj = { type: CACHE_KEYS.videoInfo.type, data: compressed.toString(CACHE_KEYS.encoding) };
        const decompressed = await CacheZLib.inflateCacheObject(deflatedObj);
        assert.deepStrictEqual(decompressed, obj);
      });

      it(testMessages.CacheZLib.inflateCacheObject[1], async function () {
        const invalidDeflatedObj = { type: 'invalid/type', data: 'invalid data' };
        await assert.rejects(async () => {
          await CacheZLib.inflateCacheObject(invalidDeflatedObj);
        }, InvalidTypeError);
      });
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

    describe('#createCache', function () {
      it(testMessages.VInfoCache.createCache[0], async function () {
        const cachePath = await VInfoCache.createCache(testVideoInfo, tempCacheDir);
        assert.ok(fs.existsSync(cachePath));
      });

      it(testMessages.VInfoCache.createCache[1], async function () {
        this.timeout(10 * 1000);  // 10s
        this.slow(5 * 1000);      // 5s

        await assert.rejects(async () => {
          await VInfoCache.createCache('invalid video info', tempCacheDir);
        }, InvalidTypeError);
      });

      it(testMessages.VInfoCache.createCache[2], async function () {
        this.timeout(10 * 1000);  // 10s
        this.slow(5 * 1000);      // 5s

        await assert.rejects(async () => {
          await VInfoCache.createCache(testVideoInfo, 123);
        }, InvalidTypeError);
      });

      it(testMessages.VInfoCache.createCache[3], async function () {
        this.timeout(10 * 1000);  // 10s
        this.slow(5 * 1000);      // 5s

        // Get the initial cache
        const originalCache = await VInfoCache.getCache(testVideoId, {
          cacheDir: tempCacheDir
        });

        // Wait at least 30ms to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 30));

        // Force overwrite the cache
        await VInfoCache.createCache(testVideoInfo, {
          cacheDir: tempCacheDir,
          force: true  // enable the force creation (overwrite)
        });

        // Wait for cache creation is fully complete (including closing its buffer)
        await new Promise(resolve => setImmediate(resolve));

        // Get updated cache after overwrite
        const updatedCache = await VInfoCache.getCache(testVideoId, {
          cacheDir: tempCacheDir
        });

        // Ensure the ID stays the same
        assert.strictEqual(originalCache.id, updatedCache.id);

        // Ensure the createdDate has changed (overwritten)
        assert.notStrictEqual(originalCache.createdDate, updatedCache.createdDate);
      });
    });

    describe('#getCache', function () {
      it(testMessages.VInfoCache.getCache[0], async function () {
        const cachedInfo = await VInfoCache.getCache(testVideoId, tempCacheDir);
        assert.strictEqual(cachedInfo.id, testVideoId);
      });

      it(testMessages.VInfoCache.getCache[1], async function () {
        await assert.rejects(async () => {
          await VInfoCache.getCache(123, tempCacheDir);
        }, InvalidTypeError);
      });

      it(testMessages.VInfoCache.getCache[2], async function () {
        await assert.rejects(async () => {
          await VInfoCache.getCache('123', tempCacheDir);
        }, IDValidationError);
      });

      it(testMessages.VInfoCache.getCache[3], async function () {
        this.timeout(5 * 1000);  // 5s
        this.slow(3 * 1000);     // 3s

        const actualCache = await VInfoCache.getCache(testVideoId, {
          cacheDir: tempCacheDir,
          humanReadable: true
        });
        assert.strictEqual(typeof actualCache, 'string');
        assert.ok(actualCache.includes(testVideoId));
      });

      it(testMessages.VInfoCache.getCache[4], async function () {
        // Will not reject if the given cache object is valid
        await assert.doesNotReject(async () => {
          await VInfoCache.getCache(testVideoId, {
            cacheDir: tempCacheDir,
            validate: true
          });
        }, CacheValidationError);
      });
    });

    describe('#getAllCaches', function () {
      it(testMessages.VInfoCache.getAllCaches[0], async function () {
        const allCaches = await VInfoCache.getAllCaches(tempCacheDir);
        assert.ok(Array.isArray(allCaches));
        assert.ok(allCaches.length > 0);
        assert.ok(allCaches.some(cache => cache.id === testVideoId));
      });

      it(testMessages.VInfoCache.getAllCaches[1], async function () {
        await assert.rejects(async () => {
          await VInfoCache.getAllCaches(0b11111);
        }, InvalidTypeError);
      });

      it(testMessages.VInfoCache.getAllCaches[2], async function () {
        const cacheDir = getTempPath(tempCacheDir);
        const allCacheList = await VInfoCache.getAllCaches({ cacheDir });
        const allCacheStr = await VInfoCache.getAllCaches({ cacheDir, humanReadable: true });

        assert.ok(Array.isArray(allCacheList));
        assert.deepStrictEqual(allCacheList, []);
        assert.strictEqual(allCacheStr, null);
      });
    });

    describe('#deleteCache', function () {
      it(testMessages.VInfoCache.deleteCache[0], async function () {
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

      it(testMessages.VInfoCache.deleteCache[1], async function () {
        await assert.doesNotReject(async () => {
          assert.strictEqual(await VInfoCache.deleteCache('non_existID', {
            cacheDir: tempCacheDir
          }), false);
        });
      });
    });

    describe('#hasExpired', function () {
      it(testMessages.hasExpired[0], async function () {
        const expiredCache = {
          createdDate: Date.now() - (CACHE_EXPIRE_TIME + 1000),
          videoInfo: { formats: [] }
        };
        const result = await hasExpired(expiredCache);
        assert.strictEqual(result, true);
      });

      it(testMessages.hasExpired[1], async function () {
        const validCache = {
          createdDate: Date.now(),
          videoInfo: { formats: [] }
        };
        const result = await hasExpired(validCache);
        assert.strictEqual(result, false);
      });
    });
  });

  after(function () {
    if (fs.existsSync(tempCacheDir)) {
      fs.rmSync(path.dirname(tempCacheDir), { recursive: true });
    }
  });
});
