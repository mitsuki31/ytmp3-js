import assert from 'node:assert';
import { getTempPath } from '@mitsuki31/temppath';

import error, { InvalidTypeError } from '../../lib/error.js';

describe('module:error', function () {
  describe('.IDExtractorError', function () {
    it('should create an instance with a message string', function () {
      const err = new error.IDExtractorError(null);
      assert.ok(err instanceof Error);
    });
  });

  describe('.UnknownOptionError', function () {
    it('should create an instance with a message string', function () {
      const err = new error.UnknownOptionError(null);
      assert.ok(err instanceof Error);
    });
  });

  describe('.InvalidTypeError', function () {
    it('should create an instance with a message string', function () {
      const err = new error.InvalidTypeError('Invalid type provided');

      assert.ok(err instanceof Error);
      assert.strictEqual(err.message, 'Invalid type provided');
      assert.deepStrictEqual({ ...err }, { });
    });

    it('should create an instance with a message from another `Error` instance', function () {
      const msg = 'Original error message';
      const originalError = new Error(msg);
      const err = new error.InvalidTypeError(originalError);

      assert.strictEqual(err.message, msg);
      assert.deepStrictEqual({ ...err }, { });
    });

    it('should create an instance with `actualType` and `expectedType` if provided', function () {
      const err = new error.InvalidTypeError('Type mismatch', {
        actualType: 'number',
        expectedType: 'string',
      });
      assert.deepStrictEqual({ ...err }, { actualType: 'number', expectedType: 'string' });
    });

    it('should not set `actualType` or `expectedType` if they are not strings', function () {
      const err = new error.InvalidTypeError('Type mismatch', {
        actualType: 42,
        expectedType: null,
      });
      assert.deepStrictEqual({ ...err }, { });
    });

    it('should set the cause if it is an instance of `Error`', function () {
      const cause = new Error('Underlying cause');
      const err = new error.InvalidTypeError('Type mismatch', { cause });
      assert.deepStrictEqual(err.cause, cause);
    });

    it('should not set the cause if it is not an instance of `Error`', function () {
      const err = new error.InvalidTypeError('Type mismatch', { cause: 'Not an error' });
      assert.strictEqual(err.cause, undefined);
    });

    it('should ignore options that are not plain objects', function () {
      const err = new error.InvalidTypeError('Type mismatch', null);
      assert.deepStrictEqual({ ...err }, { });
    });
  });

  describe('.GlobalConfigParserError', function () {
    it('should create an instance with a message string', function () {
      const err = new error.GlobalConfigParserError('Invalid configuration');

      assert.ok(err instanceof Error);
      assert.strictEqual(err.message, 'Invalid configuration');
      assert.deepStrictEqual({ ...err }, { });
    });

    it('should create an instance with a message and stack from another `Error` instance', function () {
      const msg = 'Original error message';
      const originalError = new Error(msg);
      const err = new error.GlobalConfigParserError(originalError);
      assert.strictEqual(err.message, msg);
      assert.strictEqual(err.stack, originalError.stack);
    });

    it('should set properties (errno, code, syscall, path) if provided by the cause error', function () {
      const cause = new Error('Permission denied');
      cause.errno = -13;
      cause.code = 'EACCES';
      cause.syscall = 'open';
      cause.path = '/home/foo/.ytmp3-js/ytmp3-js.config.cjs';

      const err = new error.GlobalConfigParserError('Parsing error', { cause });
      assert.deepStrictEqual({ ...err }, { ...cause });
    });

    it('should not set properties (errno, code, syscall, path) if they are not present on the cause error', function () {
      const cause = new Error('Cause without specific properties');
      const err = new error.GlobalConfigParserError('Parsing error', { cause });

      assert.deepStrictEqual({ ...err }, { });
    });

    it('should ignore options that are not plain objects', function () {
      const err = new error.GlobalConfigParserError('Parsing error', null);

      assert.deepStrictEqual({ ...err }, { });
    });
  });

  describe('.IDValidationError', function () {
    it('should create an instance with a message string', function () {
      const err = new error.IDValidationError('Invalid ID');
      assert.ok(err instanceof Error);
      assert.strictEqual(err.message, 'Invalid ID');
    });
  });

  describe('.URLValidationError', function () {
    it('should create an instance with a message string', function () {
      const err = new error.URLValidationError('Invalid URL');
      assert.ok(err instanceof Error);
      assert.strictEqual(err.message, 'Invalid URL');
    });
  });

  describe('.UnknownYouTubeDomainError', function () {
    it('should create an instance with a message string', function () {
      const err = new error.UnknownYouTubeDomainError('Unknown domain');
      assert.ok(err instanceof Error);
      assert.strictEqual(err.message, 'Unknown domain');
    });
  });

  describe('.CacheValidationError', function () {
    it('should create an instance with a message string', function () {
      const err = new error.CacheValidationError('Invalid cache');
      assert.ok(err instanceof Error);
      assert.strictEqual(err.message, 'Invalid cache');
    });

    it('should create an instance with a message from another `Error` instance', function () {
      const msg = 'Original error message';
      const originalError = new Error(msg);
      const err = new error.CacheValidationError(originalError);
      assert.strictEqual(err.message, msg);
    });

    it('should create an instance with `id`, `type`, and `path` if provided', function () {
      const opts = {
        id: 'cache123',
        type: 'memory',
        path: '/cache/path'
      };
      const err = new error.CacheValidationError('Cache error', opts);
      assert.deepStrictEqual({ ...err }, opts);
    });

    it('should not set `id`, `type`, or `path` if they are not strings', function () {
      const err = new error.CacheValidationError('Cache error', {
        id: 123,
        type: null,
        path: {},
      });
      assert.deepStrictEqual({ ...err }, { });
    });

    it('should set the cause if it is an instance of `Error`', function () {
      const cause = new Error('Underlying cause');
      const err = new error.CacheValidationError('Cache error', { cause });
      assert.strictEqual(err.cause, cause);
    });

    it('should not set the cause if it is not an instance of `Error`', function () {
      const err = new error.CacheValidationError('Cache error', { cause: 'Not an error' });
      assert.strictEqual(err.cause, undefined);
    });

    it('should ignore options that are not plain objects', function () {
      const err = new error.CacheValidationError('Cache error', null);
      assert.deepStrictEqual({ ...err }, { });
    });
  });
});
