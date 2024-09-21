import assert from 'node:assert';

import yturlfmt from '../../lib/utils/yt-urlfmt.js';

describe('module:yt-urlfmt', function () {
  const testMessage = 'check and validate regular expression';

  describe('~STANDARD', function () {
    it(testMessage, function () {
      assert.ok(yturlfmt.STANDARD.test('https://www.youtube.com/watch?v=abcde_12345'));
      assert.ok(yturlfmt.STANDARD.test('https://m.youtube.com/watch?v=abcde_12345'));
    });
  });

  describe('~SHORTENED', function () {
    it(testMessage, function () {
      assert.ok(yturlfmt.SHORTENED.test('https://youtu.be/abcde_12345'));
    });
  });

  describe('~VIDEO', function () {
    it(testMessage, function () {
      assert.ok(yturlfmt.VIDEO.test('https://www.youtube.com/watch?v=abcde_12345'));
      assert.ok(yturlfmt.VIDEO.test('https://m.youtube.com/watch?v=abcde_12345'));
      assert.ok(yturlfmt.VIDEO.test('https://youtu.be/abcde_12345'));
    });
  });

  describe('~CHANNEL', function () {
    it(testMessage, function () {
      assert.ok(yturlfmt.CHANNEL.test('https://www.youtube.com/channel/abcde_12345'));
      assert.ok(yturlfmt.CHANNEL.test('https://m.youtube.com/channel/abcde_12345'));
    });
  });

  describe('~PLAYLIST', function () {
    it(testMessage, function () {
      assert.ok(yturlfmt.PLAYLIST.test('https://www.youtube.com/playlist?list=abcde_12345'));
      assert.ok(yturlfmt.PLAYLIST.test('https://m.youtube.com/playlist?list=abcde_12345'));
    });
  });

  describe('~MUSIC', function () {
    it(testMessage, function () {
      assert.ok(yturlfmt.MUSIC.test('https://music.youtube.com/watch?v=abcde_12345'));
      assert.ok(yturlfmt.MUSIC.test('https://music.youtube.com/playlist?list=abcde_12345'));
    });
  });
});
