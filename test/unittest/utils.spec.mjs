import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getTempPath } from '@mitsuki31/temppath';

import utils from '../../lib/utils.js';

describe('module:utils', function () {
  const testMessages = {
    logger: [
      'test info message',
      'test done message',
      'test debug message',
      'test warning message',
      'test error message'
    ],
    isNullOrUndefined: [
      'should return true if given argument is a nullable value'
    ],
    isObject: [
      'should return true if supplied with a literal object'
    ],
    ProgressBar: [
      'should initialize a new instance class',
      'check the options of created `ProgressBar` instance',
      'should create the formatted progress bar'
    ],
    createDirIfNotExist: [
      'should create a new directory if not exist asynchronously',
      'should reject if the given path is not a string'
    ],
    createDirIfNotExistSync: [
      'should create a new directory if not exist synchronously',
      'should throw if the given path is not a string'
    ],
    dropNullAndUndefined: [
      'should return filtered object without null or undefined properties'
    ]
  };

  describe('~logger', function () {
    let consoleLog = null;
    let consoleError = null;

    before(function () {
      consoleLog = console.log;
      consoleError = console.error;
      console.log = function () {};
      console.error = function () {};
    });

    describe('#info', function () {
      it(testMessages.logger[0], function () {
        utils.logger.info('test');
      });
    });
    describe('#done', function () {
      it(testMessages.logger[1], function () {
        utils.logger.done('test');
      });
    });
    describe('#debug', function () {
      it(testMessages.logger[2], function () {
        utils.logger.debug('test');
      });
    });
    describe('#warn', function () {
      it(testMessages.logger[3], function () {
        utils.logger.warn('test');
      });
    });
    describe('#error', function () {
      it(testMessages.logger[4], function () {
        utils.logger.error('test');
      });
    });

    after(function () {
      console.log = consoleLog;
      console.error = consoleError;
    });
  });

  describe('#isNullOrUndefined', function () {
    it(testMessages.isNullOrUndefined[0], function () {
      assert.ok(utils.isNullOrUndefined(null) === true);
      assert.ok(utils.isNullOrUndefined(undefined) === true);
      assert.ok(utils.isNullOrUndefined([]) === false);
      assert.ok(utils.isNullOrUndefined({}) === false);
      assert.ok(utils.isNullOrUndefined('foo') === false);
    });
  });

  describe('#isObject', function () {
    it(testMessages.isObject[0], function () {
      assert.ok(utils.isObject({}) === true);
      assert.ok(utils.isObject([]) === false);
      assert.ok(utils.isObject(new RegExp('foo')) === false);
      assert.ok(utils.isObject(100n) === false);
    });
  });

  describe('.ProgressBar', function () {
    let pb;  // Store the ProgressBar instance

    before(function () {
      pb = new utils.ProgressBar();  // Use default setting
    });

    it(testMessages.ProgressBar[0], function () {
      assert.notStrictEqual(pb, null);
      assert.notStrictEqual(typeof pb, 'undefined');
    });

    it(testMessages.ProgressBar[1], function () {
      assert.deepEqual(pb.options, {
        barWidth: 'auto',
        barCharTotal: '-',
        barCharElapsed: '#',
        bytesInfo: true
      });
    });

    it(testMessages.ProgressBar[2], function () {
      const bar = pb.create(0, 0);
      assert.notStrictEqual(bar, null);
      assert.notStrictEqual(typeof bar, 'undefined');
      assert.notStrictEqual(bar.length, 0);
    });
  });

  describe('#createDirIfNotExist', function () {
    let tempDir;

    before(function () {
      tempDir = getTempPath('tmp', 25);
    });

    it(testMessages.createDirIfNotExist[0], async function () {
      await utils.createDirIfNotExist(tempDir);
    });

    it(testMessages.createDirIfNotExist[1], function () {
      return new Promise((resolve) => {
        assert.rejects(utils.createDirIfNotExist([ 'foo' ]), TypeError);
        resolve();
      });
    });

    after(function () {
      // Do not forget to remove temporary directory created before
      if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
    });
  });

  describe('#createDirIfNotExistSync', function () {
    let tempDir;
    
    before(function () {
      tempDir = getTempPath('tmp', 20);
    });

    it(testMessages.createDirIfNotExistSync[0], function () {
      utils.createDirIfNotExistSync(tempDir);
    });

    it(testMessages.createDirIfNotExistSync[1], function () {
      assert.throws(() => utils.createDirIfNotExistSync(123), TypeError);
    });

    after(function () {
      if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
    });
  });

  describe('#dropNullAndUndefined', function () {
    it(testMessages.dropNullAndUndefined[0], function () {
      const obj = {
        a: 123, b: 456,
        c: null, d: 789,
        e: undefined
      };
      const expectedObj = {
        a: 123, b: 456, d: 789
      };
      const actualObj = utils.dropNullAndUndefined(obj);
      assert.deepStrictEqual(actualObj, expectedObj);
    });
  });
});
