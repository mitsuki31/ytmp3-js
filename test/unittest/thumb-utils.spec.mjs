import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import error from '../../lib/error.js';
import utils from '../../lib/utils/index.js';
const { TypeUtils, ThumbnailUtils } = utils;
const { InvalidTypeError } = error;
const { getType } = TypeUtils;

describe('module:utils/thumb-utils', function () {
  const A_THUMBNAILS = [];  // Store the author thumbnail objects
  const V_THUMBNAILS = [];  // Store the video thumbnail objects
  const VIDEO_DETAILS = {};
  let videoThumbnailsPath, authorThumbnailsPath;

  before(async function () {
    const testAssets = path.join(utils.ROOTDIR, 'test', 'assets');
    videoThumbnailsPath = path.join(testAssets, 'json', 'videoThumbnails.json');
    authorThumbnailsPath = path.join(testAssets, 'json', 'authorThumbnails.json');

    Object.assign(V_THUMBNAILS, JSON.parse(await fs.promises.readFile(videoThumbnailsPath)));
    Object.assign(A_THUMBNAILS, JSON.parse(await fs.promises.readFile(authorThumbnailsPath)));
    Object.assign(VIDEO_DETAILS, {
      thumbnails: V_THUMBNAILS,
      author: { thumbnails: A_THUMBNAILS }
    });
  });

  describe('~ThumbnailUtils', function () {
    const testMessages = {
      sortThumbnailsByResolution: [
        'should sort the thumbnails by resolution',
        'should throw a InvalidTypeError if the input is not an array'
      ],
      getAuthorThumbnails: [
        'should return the author thumbnails',
        'should return an empty array if no author thumbnails are available',
        'should throw a InvalidTypeError if the input is not an object'
      ],
      getVideoThumbnails: [
        'should return the video thumbnails',
        'should return an empty array if no video thumbnails are available',
        'should throw a InvalidTypeError if the input is not an object'
      ],
      getAllThumbnails: [
        'should return an object containing all thumbnails including author and video thumbnails',
        'should return an object containing empty array if no author thumbnails are available',
        'should return an object containing empty array if no video thumbnails are available',
        'should throw a InvalidTypeError if the input is not an object'
      ],
      getThumbnailByResolution: [
        'should return the thumbnail with the specified resolution',
        'should return null if no thumbnail matches the specified resolution',
        'should throw a InvalidTypeError for invalid resolution type',
        'should throw a InvalidTypeError if the thumbnails is not an array',
        'should be able to handle the case where the thumbnails are author thumbnails'
      ],
      getThumbnail: [
        'should return the thumbnail with the specified resolution',
        'should default to return the thumbnail with the highest resolution if no resolution type is specified',
        'should return null if no thumbnail matches the specified resolution',
        'should throw a InvalidTypeError for invalid resolution type'
      ]
    };

    describe('.sortThumbnailsByResolution', function () {
      it(testMessages.sortThumbnailsByResolution[0], function () {
        const unsortedThumbnails = [
          { width: 320, height: 180 },
          { width: 120, height: 90 },
          { width: 640, height: 360 }
        ];
        const sortedThumbnails = ThumbnailUtils.sortThumbnailsByResolution(unsortedThumbnails);
        assert.deepStrictEqual(sortedThumbnails, [
          { width: 120, height: 90 },
          { width: 320, height: 180 },
          { width: 640, height: 360 }
        ]);
        assert.strictEqual(sortedThumbnails[0].width, 120);
        assert.strictEqual(sortedThumbnails[0].height, 90);
      });

      it(testMessages.sortThumbnailsByResolution[1], function () {
        assert.throws(() => ThumbnailUtils.sortThumbnailsByResolution('not an array'), InvalidTypeError);
        assert.throws(() => ThumbnailUtils.sortThumbnailsByResolution({ }), InvalidTypeError);
      });
    });

    describe('.getAuthorThumbnails', function () {
      it(testMessages.getAuthorThumbnails[0], function () {
        const authorThumbnails = ThumbnailUtils.getAuthorThumbnails(VIDEO_DETAILS);
        assert.ok(Array.isArray(authorThumbnails));
        assert.strictEqual(authorThumbnails.length, A_THUMBNAILS.length);
        assert.deepStrictEqual(authorThumbnails, A_THUMBNAILS);
      });

      it(testMessages.getAuthorThumbnails[1], function () {
        const emptyVideoDetails = {};
        const authorThumbnails = ThumbnailUtils.getAuthorThumbnails(emptyVideoDetails);
        assert.ok(Array.isArray(authorThumbnails));
        assert.strictEqual(authorThumbnails.length, 0);
        assert.deepStrictEqual(authorThumbnails, []);
      });

      it(testMessages.getAuthorThumbnails[2], function () {
        assert.throws(() => ThumbnailUtils.getAuthorThumbnails([]), InvalidTypeError);
        assert.throws(() => ThumbnailUtils.getAuthorThumbnails(true), InvalidTypeError);
        assert.throws(() => ThumbnailUtils.getAuthorThumbnails(123n), InvalidTypeError);
      });
    });

    describe('.getVideoThumbnails', function () {
      it(testMessages.getVideoThumbnails[0], function () {
        const videoThumbnails = ThumbnailUtils.getVideoThumbnails(VIDEO_DETAILS);
        assert.ok(Array.isArray(videoThumbnails));
        assert.strictEqual(videoThumbnails.length, V_THUMBNAILS.length);
        assert.deepStrictEqual(videoThumbnails, V_THUMBNAILS);
      });

      it(testMessages.getVideoThumbnails[1], function () {
        const emptyVideoDetails = {};
        const videoThumbnails = ThumbnailUtils.getVideoThumbnails(emptyVideoDetails);
        assert.ok(Array.isArray(videoThumbnails));
        assert.strictEqual(videoThumbnails.length, 0);
        assert.deepStrictEqual(videoThumbnails, []);
      });

      it(testMessages.getVideoThumbnails[2], function () {
        assert.throws(() => ThumbnailUtils.getVideoThumbnails([]), InvalidTypeError);
        assert.throws(() => ThumbnailUtils.getVideoThumbnails(false), InvalidTypeError);
        assert.throws(() => ThumbnailUtils.getVideoThumbnails(555), InvalidTypeError);
      });
    });

    describe('.getAllThumbnails', function () {
      it(testMessages.getAllThumbnails[0], function () {
        const allThumbnails = ThumbnailUtils.getAllThumbnails(VIDEO_DETAILS);
        assert.ok(TypeUtils.isPlainObject(allThumbnails));
        assert.deepStrictEqual(Object.keys(allThumbnails), ['author', 'video']);
        assert.ok(Array.isArray(allThumbnails.author));
        assert.ok(Array.isArray(allThumbnails.video));
        assert.strictEqual(allThumbnails.video.length, V_THUMBNAILS.length);
        assert.strictEqual(allThumbnails.author.length, A_THUMBNAILS.length);
        assert.deepStrictEqual(allThumbnails.video, V_THUMBNAILS);
        assert.deepStrictEqual(allThumbnails.author, A_THUMBNAILS);
      });

      it(testMessages.getAllThumbnails[1], function () {
        const emptyVideoDetails = {};
        const allThumbnails = ThumbnailUtils.getAllThumbnails(emptyVideoDetails);
        assert.ok(TypeUtils.isPlainObject(allThumbnails));
        assert.ok(Array.isArray(allThumbnails.author));
        assert.ok(Array.isArray(allThumbnails.video));
        assert.strictEqual(allThumbnails.author.length, 0);
        assert.strictEqual(allThumbnails.video.length, 0);
        assert.deepStrictEqual(allThumbnails.author, []);
        assert.deepStrictEqual(allThumbnails.video, []);
      });

      it(testMessages.getAllThumbnails[2], function () {
        assert.throws(() => ThumbnailUtils.getAllThumbnails(new Date()), InvalidTypeError);
        assert.throws(() => ThumbnailUtils.getAllThumbnails('foo'), InvalidTypeError);
        assert.throws(() => ThumbnailUtils.getAllThumbnails(0x01), InvalidTypeError);
      });
    });

    describe('.getThumbnailByResolution', function () {
      it(testMessages.getThumbnailByResolution[0], function () {
        const thumbnails = [V_THUMBNAILS, A_THUMBNAILS].map((thumbs) => {
          return ThumbnailUtils.getThumbnailByResolution(thumbs, 'high');
        });
        const expectedThumbnails = [
          V_THUMBNAILS.find(t => t.url.includes('maxresdefault'))
            || V_THUMBNAILS.find(t => t.url.includes('sddefault')) || null,
          A_THUMBNAILS[A_THUMBNAILS.length - 1]
        ];
        assert.deepStrictEqual(thumbnails, expectedThumbnails);
      });

      it(testMessages.getThumbnailByResolution[1], function () {
        const thumbnailsWithoutMaxRes = V_THUMBNAILS.filter(t => !t.url.includes('maxresdefault'));

        const thumbnail = ThumbnailUtils.getThumbnailByResolution(thumbnailsWithoutMaxRes, 'max');
        const expectedThumbnail = thumbnailsWithoutMaxRes.find(t => t.url.includes('maxresdefault')) || null;
        assert.strictEqual(thumbnail, null);
        assert.strictEqual(thumbnail, expectedThumbnail);  // They both should be null
      });

      it(testMessages.getThumbnailByResolution[2], function () {
        assert.throws(() => ThumbnailUtils.getThumbnailByResolution(A_THUMBNAILS, 'invalid'), InvalidTypeError);
        assert.throws(() => ThumbnailUtils.getThumbnailByResolution(A_THUMBNAILS, [ 'low' ]), InvalidTypeError);
      });

      it(testMessages.getThumbnailByResolution[3], function () {
        assert.throws(() => ThumbnailUtils.getThumbnailByResolution({ thumbnails: [] }, 'medium'), InvalidTypeError);
      });

      it(testMessages.getThumbnailByResolution[4], function () {
        const thumbnail = ThumbnailUtils.getThumbnailByResolution(A_THUMBNAILS, 'max');
        const expectedThumbnail = A_THUMBNAILS[A_THUMBNAILS.length - 1];
        assert.deepStrictEqual(thumbnail, expectedThumbnail);
      });
    });

    describe('.getThumbnail', function () {
      it(testMessages.getThumbnail[0], function () {
        const thumbnail = ThumbnailUtils.getThumbnail(V_THUMBNAILS, 'high');
        const expectedThumbnail = V_THUMBNAILS.find(t => t.url.includes('maxresdefault'))
          || V_THUMBNAILS.find(t => t.url.includes('sddefault'));  // Fallback thumbnail if no `maxresdefault` found
        assert.deepStrictEqual(thumbnail, expectedThumbnail);
      });

      it(testMessages.getThumbnail[1], function () {
        const thumbnail = ThumbnailUtils.getThumbnail(V_THUMBNAILS);
        const expectedThumbnail = V_THUMBNAILS.find(t => t.url.includes('maxresdefault'))
          || V_THUMBNAILS.find(t => t.url.includes('sddefault'));  // Fallback thumbnail if no `maxresdefault` found
        assert.deepStrictEqual(thumbnail, expectedThumbnail);
      });

      it(testMessages.getThumbnail[2], function () {
        const emptyThumbnails = [];
        const thumbnail = ThumbnailUtils.getThumbnail(emptyThumbnails);
        assert.strictEqual(thumbnail, null);
      });
    });
  });
});
