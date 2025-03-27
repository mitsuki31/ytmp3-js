import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTempPath } from '@mitsuki31/temppath';

import error from '../../lib/error.js';
import utils from '../../lib/utils/index.js';
const { InvalidTypeError } = error;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('module:utils', function () {
  let TMPDIR;
  const testMessages = {
    logger: {
      info: 'test info() log function',
      done: 'test done() log function',
      debug: 'test debug() log function',
      warning: 'test warning() log function',
      error: 'test error() log function',
      write: [
        'should not use styling text if stream is not TTY (i.e., a file)',
        'should use default prefix if not explicitly provided',
        'should throw a Error if the given stream already closed before writing',
        // both arguments (prefix and stream) cannot be a WritableStream in one-place
        'should throw a InvalidTypeError if both arguments are stream'
      ],
      line: 'test line() function',
      createLogger: [
        "should create a Logger object with log level 'NONE'",
        "should create a Logger object with log level 'DEBUG'",
        "should create a Logger object with log level 'INFO'",
        "should create a Logger object with log level 'WARNING'",
        "should create a Logger object with log level 'ERROR'",
        'should use standard streams (stdout & stderr) if no streams are explicitly provided',
        'should throw a InvalidTypeError if stdout or stderr is not a writable stream'
      ]
    },
    isNullOrUndefined: [
      'should return true if given argument is a nullable value'
    ],
    isObject: [
      'should return true if supplied with any object except array'
    ],
    isPlainObject: [
      'should return true if supplied with a plain object only including null prototype object'
    ],
    ProgressBar: [
      'should initialize a new instance class',
      'should check the options of created `ProgressBar` instance',
      'should create the formatted progress bar',
      'should test the progress bar creation'
    ],
    createLogFile: [
      'should create a log file with default prefix',
      'should create a log file with specified prefix',
      'should fallback to default prefix if the given prefix is nullable or falsy value'
    ],
    createDirIfNotExist: [
      'should asynchronously create a new directory if not exist',
      'should not create if the directory exists',
      'should reject if the given path is not a string'
    ],
    createDirIfNotExistSync: [
      'should synchronously create a new directory if not exist',
      'should not create if the directory exists',
      'should throw if the given path is not a string'
    ],
    dropNullAndUndefined: [
      'should return filtered object without null or undefined properties'
    ],
    getType: [
      'should return a string representing the given object',
      'should return a string representing the name of given object'
    ]
  };

  before(async function () {
    TMPDIR = path.resolve(utils.ROOTDIR, 'tmp');
    if (!fs.existsSync(TMPDIR)) await fs.promises.mkdir(TMPDIR);
  });

  describe('~logger', function () {
    const { LOG_LEVELS } = utils.logger;
    const EMPTY_LOGGER_REGEX = /^(function\s*\((\.\.\.\w+)?\)|\((\.\.\.\w+)?\)\s*=>)\s*{[\s\n]*};*/;
    const consoleLog = console.log;
    const consoleError = console.error;

    function checkNoCircularRef(logger) {
      const expectedLogger = {
        ...utils.logger,
        stdout: void 0,
        stderr: void 0,
        level: void 0
      };
      delete expectedLogger.log;
      delete expectedLogger.logger;
      delete expectedLogger.createLogger;
      assert.deepStrictEqual(
        Object.keys(logger),
        Object.keys(expectedLogger)
      );
    }

    before(function () {
      console.log = function () {};
      console.error = function () {};
    });

    describe('#info', function () {
      it(testMessages.logger.info, function () {
        const columns = process.stdout.columns;
        utils.logger.info('test');  // Test
        process.stdout.columns = 70;
        utils.logger.info('test');  // Test
        process.stdout.columns = columns;
      });
    });

    describe('#done', function () {
      it(testMessages.logger.done, function () {
        const columns = process.stdout.columns;
        utils.logger.done('test');  // Test
        process.stdout.columns = 70;
        utils.logger.done('test');  // Test
        process.stdout.columns = columns;
      });
    });

    describe('#debug', function () {
      it(testMessages.logger.debug, function () {
        const columns = process.stdout.columns;
        utils.logger.debug('test');  // Test
        process.stdout.columns = 70;
        utils.logger.debug('test');  // Test
        process.stdout.columns = columns;
      });
    });

    describe('#warn', function () {
      it(testMessages.logger.warning, function () {
        const columns = process.stdout.columns;
        utils.logger.warn('test');  // Test
        process.stdout.columns = 70;
        utils.logger.warn('test');  // Test
        process.stdout.columns = columns;
      });
    });

    describe('#error', function () {
      it(testMessages.logger.error, function () {
        const columns = process.stdout.columns;
        utils.logger.error('test');  // Test
        process.stdout.columns = 70;
        utils.logger.error('test');  // Test
        process.stdout.columns = columns;
      });
    });

    describe('#write', function () {
      const createWriteStreamStub = fs.createWriteStream;

      before(function () {
        fs.createWriteStream = (path, options) => {
          const stream = createWriteStreamStub(path, options);
          // Close the stream at the next tick
          process.nextTick(() => stream.close());
          return stream;
        };
      })

      it(testMessages.logger.write[0], function (done) {
        this.timeout(5 * 1000);  // 5s
        this.slow(2 * 1000);     // 2s

        let stream;

        async function postWrite(err) {
          if (err instanceof Error) {
            process.nextTick(() => done(err));
            return;
          }

          assert.notStrictEqual(
            (await fs.promises.readFile(stream.path, 'utf8')).trim().length,
            0
          );
          await fs.promises.rm(stream.path);
          done();
        }

        try {
          stream = createWriteStreamStub(getTempPath(TMPDIR) + '.tmp');
          utils.logger.write('Hello from test', stream);
        } catch (err) {
          throw err;
        } finally {
          setImmediate(() => stream && stream.close(postWrite));
        }
      });

      it(testMessages.logger.write[1], function (done) {
        const logMessage = 'Hello from test';
        const matchRegex = new RegExp(`\\[[0-9.:]+\\]::.+${logMessage}`);
        let stream;
        let contents;

        async function postWrite(err) {
          if (err instanceof Error) {
            process.nextTick(() => done(err));
            return;
          }

          contents = await fs.promises.readFile(stream.path, 'utf8');
          assert.match(contents, matchRegex);

          // Clean up
          await fs.promises.rm(stream.path);
          done();
        }

        try {
          stream = createWriteStreamStub(getTempPath(TMPDIR) + '.tmp');
          utils.logger.write(logMessage, stream);
        } catch (err) {
          throw err;
        } finally {
          setImmediate(() => stream && stream.close(postWrite));
        }
      });

      it(testMessages.logger.write[2], function () {
        const stream = fs.createWriteStream(getTempPath(TMPDIR) + '.tmp');
        try {
          utils.logger.write('Hello from test', stream);
        } catch (err) {
          assert.ok(err instanceof Error);
          assert.match(err.message, /stream[\s\w]*is[\s\w]*closed/i);
        } finally {
          // Just to make sure the stream is closed
          stream.closed || stream.close();
        }
      });

      it(testMessages.logger.write[3], function () {
        const stream = fs.createWriteStream(getTempPath(TMPDIR) + '.tmp');
        assert.throws(() => {
          utils.logger.write('Hello from test', stream, stream);
        }, InvalidTypeError);
      });

      after(function () {
        fs.createWriteStream = createWriteStreamStub;
      });
    });

    describe('#line', function () {
      it(testMessages.logger.line, function () {
        const columns = process.stdout.columns;
        utils.logger.line();  // Test
        process.stdout.columns = 70;
        utils.logger.line();  // Test
        process.stdout.columns = columns;
      });
    });

    describe('#createLogger', function () {
      it(testMessages.logger.createLogger[0], function () { 
        const logger = utils.logger.createLogger(LOG_LEVELS.DEBUG);
        checkNoCircularRef(logger);
      });

      it(testMessages.logger.createLogger[1], function () {
        const logger = utils.logger.createLogger(LOG_LEVELS.INFO);
        checkNoCircularRef(logger);
        assert.match(Function.toString.call(logger.debug), EMPTY_LOGGER_REGEX);
      });

      it(testMessages.logger.createLogger[2], function () {
        const logger = utils.logger.createLogger(LOG_LEVELS.WARNING);
        checkNoCircularRef(logger);
        ['debug', 'info'].forEach(fn =>
          assert.match(Function.toString.call(logger[fn]), EMPTY_LOGGER_REGEX));
      });

      it(testMessages.logger.createLogger[3], function () {
        const logger = utils.logger.createLogger(LOG_LEVELS.ERROR);
        checkNoCircularRef(logger);
        ['debug', 'info', 'warn'].forEach(fn =>
          assert.match(Function.toString.call(logger[fn]), EMPTY_LOGGER_REGEX));
      });

      it(testMessages.logger.createLogger[4], function () {
        const logger = utils.logger.createLogger(LOG_LEVELS.NONE);
        checkNoCircularRef(logger);
        ['debug', 'info', 'warn', 'error'].forEach(fn =>
          assert.match(Function.toString.call(logger[fn]), EMPTY_LOGGER_REGEX));
      });

      it(testMessages.logger.createLogger[5], function () {
        const logger = utils.logger.createLogger(LOG_LEVELS.WARNING);
        assert.deepStrictEqual(logger.stdout, process.stdout);
        assert.deepStrictEqual(logger.stderr, process.stderr);
      });

      it(testMessages.logger.createLogger[6], function () {
        ['stdout', 'stderr'].forEach(prop => {
          assert.throws(() => {
            const randomPath = getTempPath(TMPDIR, 10) + '.tmp';
            utils.logger.createLogger(LOG_LEVELS.DEBUG, { [prop]: randomPath });
          }, InvalidTypeError);
        });
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
      assert.equal(utils.isObject({}), true);
      assert.equal(utils.isObject([]), false);
      assert.equal(utils.isObject(new RegExp('foo')), true);
      assert.equal(utils.isObject(100n), false);
      assert.equal(utils.isPlainObject(Object.create(null)), true);
      assert.equal(utils.isObject(new Set()), true);
    });
  });

  describe('#isPlainObject', function () {
    it(testMessages.isPlainObject[0], function () {
      assert.equal(utils.isPlainObject({}), true);
      assert.equal(utils.isPlainObject([]), false);
      assert.equal(utils.isPlainObject(/g/i), false);
      assert.equal(utils.isPlainObject(Object.create(null)), true);
      assert.equal(utils.isPlainObject(new Set()), false);
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
      // Dummy test
      assert.doesNotThrow(() => new utils.ProgressBar({
        barWidth: 20,
        barCharTotal: '_',
        barCharElapsed: '$',
        bytesInfo: false
      }));
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

      // Dummy test
      const columns = process.stdout.columns;
      if ('columns' in process.stdout) delete process.stdout.columns;
      new utils.ProgressBar({ barWidth: 'auto' }).create(1, 10);
      if (columns) process.stdout.columns = columns;
    });

    it(testMessages.ProgressBar[3], function () {
      const pb = new utils.ProgressBar({ barWidth: 10 });
      const totalBytes = 3000;
      let bytesDownloaded = 0;
      this.timeout(totalBytes);
      this.slow(totalBytes / 3);

      return new Promise((resolve) => {
        const interval = setInterval(() => {
          if (bytesDownloaded >= totalBytes) {
            clearInterval(interval);
          }
          bytesDownloaded += Math.random() * 500;
          // Dump the output
          pb.create(bytesDownloaded, totalBytes);
          resolve();
        }, 70);
      });
    });
  });

  describe('#createLogFile', function () {
    it(testMessages.createLogFile[0], function () {
      const logFile = utils.createLogFile();
      assert.ok(!utils.isNullOrUndefined(logFile));
      assert.strictEqual(typeof logFile, 'string');
      assert.ok(logFile.startsWith('ytmp3Error'));
    });

    it(testMessages.createLogFile[1], function () {
      const prefix = 'testError#';
      assert.ok(utils.createLogFile(prefix).startsWith(prefix));
    });

    it(testMessages.createLogFile[2], function () {
      const defaultPrefix = 'ytmp3Error';
      ['', false, null, undefined, 0].forEach((prefix) => {
        assert.ok(utils.createLogFile(prefix).startsWith(defaultPrefix));
      });
    });
  });

  describe('#createDirIfNotExist', function () {
    let tempDir;

    before(function () {
      tempDir = getTempPath(path.join(utils.ROOTDIR, 'tmp'), 25);
    });

    it(testMessages.createDirIfNotExist[0], async function () {
      await utils.createDirIfNotExist(tempDir);
    });

    it(testMessages.createDirIfNotExist[1], function () {
      // If only check, the function run synchronous
      utils.createDirIfNotExist(__dirname);
      assert.ok(fs.statSync(__dirname).isDirectory());
    });

    it(testMessages.createDirIfNotExist[2], function () {
      return new Promise((resolve) => {
        assert.rejects(() => utils.createDirIfNotExist([ 'foo' ]), TypeError);
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
      tempDir = getTempPath(path.join(utils.ROOTDIR, 'tmp'), 20);
    });

    it(testMessages.createDirIfNotExistSync[0], function () {
      utils.createDirIfNotExistSync(tempDir);
    });

    it(testMessages.createDirIfNotExistSync[1], function () {
      utils.createDirIfNotExistSync(__dirname);
      assert.ok(fs.statSync(__dirname).isDirectory());
    });

    it(testMessages.createDirIfNotExistSync[2], function () {
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

  describe('#getType', function () {
    it(testMessages.getType[0], function () {
      assert.strictEqual(utils.getType({}), '[object Object]');
      assert.strictEqual(utils.getType(new Error()), '[object Error]');
    });

    it(testMessages.getType[1], function () {
      assert.strictEqual(utils.getType({}, true), 'Object');
      assert.strictEqual(utils.getType(new Error(), true), 'Error');
    });
  });
});
