import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { format } from 'node:util';
import { tmpdir } from 'node:os';
import { lsFiles } from 'lsfnd';
import { getTempPath } from '@mitsuki31/temppath';

import config from '../../lib/config.js';
import utils from'../../lib/utils.js';
import audioconv from '../../lib/audioconv.js';
import error from '../../lib/error.js';
const {
  UnknownOptionError,
  InvalidTypeError,
  GlobalConfigParserError
} = error;

describe('module:config', function () {
  const testMessages = {
    importConfig: [
      'should parse and resolve the JSON configuration file',
      'should parse and resolve the ES Module configuration file',
      'should parse and resolve the CommonJS configuration file',
      'should throw `InvalidTypeError` when configuration file path is not a string',
      'should throw `Error` if configuration file extension are unknown'
    ],
    parseConfig: [
      'should validate only the configuration file',
      'should validate and resolve the configuration file',
      'should handle Windows path while importing configuration file',
      'should reject if an error occurred while importing configuration file'
    ],
    resolveConfig: [
      'should resolve audio conversion options from `converterOptions` field',
      'should return an empty object when specified configuration with nullable value'
    ],
    configChecker: [
      'should throw `InvalidTypeError` if the given config is not an object',
      'should throw `UnknownOptionError` when found unknown download options',
      'should throw `InvalidTypeError` if any known options is not an object type'
    ],
    findGlobalConfig: [
      'should return the path to the global config file',
      'should return null if `searchDir` is not a directory',
      'should throw an error if `fs.stat` fails with an unexpected error'
    ],
    parseGlobalConfig: [
      'should return an object with parsed configuration settings',
      'should throw an error if any option in configuration file is invalid',
      'should throw an error if the configuration file is unreadable',
      'should throw an error if the parser options is not a plain object',
      'should throw an error if the given configuration path is not a string'
    ]
  };
  let configObj;
  let expectedResolvedConfig;
  let tempFileNoExt;

  before(function () {
    tempFileNoExt = path.join(
      utils.ROOTDIR, 'tmp', 'config@unittest',
      'tempTestConfig'
    );
    configObj = {
      downloadOptions: {
        cwd: null,
        outDir: 'tmp/downloads',
      },
      audioConverterOptions: {
        format: 'opus',
        codec: 'libopus',
        frequency: 12000,
        channels: 1
      }
    };
    expectedResolvedConfig = {
      cwd: path.resolve('.'),
      outDir: path.resolve('.', 'tmp', 'downloads'),
      convertAudio: true,
      quiet: false,
      converterOptions: {
        inputOptions: undefined,
        outputOptions: undefined,
        format: 'opus',
        codec: 'libopus',
        frequency: 12000,
        bitrate: undefined,
        channels: 1,
        deleteOld: undefined,
        quiet: undefined
      }
    };

    utils.createDirIfNotExistSync(path.dirname(tempFileNoExt));
  });

  describe('#importConfig', function () {
    it(testMessages.importConfig[0], async function () {
      const tempFile = tempFileNoExt + '.json';
      await new Promise((resolve) => {
        const stream = fs.createWriteStream(tempFile, { flush: true });

        stream.write(JSON.stringify(configObj));
        stream.end();
        stream.on('finish', resolve);
      });

      const resolvedConfig = await config.importConfig(tempFile);

      assert.equal(utils.isNullOrUndefined(resolvedConfig), false);
      assert.deepStrictEqual(resolvedConfig, expectedResolvedConfig);
    });

    it(testMessages.importConfig[1], async function () {
      const tempFile = tempFileNoExt + '.config.mjs';
      await new Promise((resolve) => {
        const stream = fs.createWriteStream(tempFile, { flush: true });
        const content = `export default ${format(configObj)};`
          .replace(/(\s{2,}|\r?\n)/g, ' ')
          .trim().concat('\n');

        stream.write(content);
        stream.end();
        stream.on('finish', resolve);
      });

      const resolvedConfig = await config.importConfig(tempFile);

      assert.equal(utils.isNullOrUndefined(resolvedConfig), false);
      assert.deepStrictEqual(resolvedConfig, expectedResolvedConfig);
    });

    it(testMessages.importConfig[2], async function () {
      const tempFile = tempFileNoExt + '.config.cjs';
      await new Promise((resolve) => {
        const stream = fs.createWriteStream(tempFile, { flush: true });
        const content = `module.exports = ${format(configObj)};`
          .replace(/(\s{2,}|\r?\n)/g, ' ')
          .trim();

        stream.write(content);
        stream.end();
        stream.on('finish', resolve);
      });

      const resolvedConfig = await config.importConfig(tempFile);

      assert.equal(utils.isNullOrUndefined(resolvedConfig), false);
      assert.deepStrictEqual(resolvedConfig, expectedResolvedConfig);
    });

    it(testMessages.importConfig[3], async function () {
      await assert.rejects(async () => {
        await config.importConfig(123n);
      }, InvalidTypeError);
    });

    it(testMessages.importConfig[4], async function () {
      await assert.rejects(async () => {
        await config.importConfig(tempFileNoExt + '.docx');
      }, Error);
    });
  });

  describe('#parseConfig', function () {
    let tempFile;

    before(async function () {
      tempFile = tempFileNoExt + '.js';

      await new Promise((resolve) => {
        const stream = fs.createWriteStream(tempFile, { flush: true });
        const content = `exports = ${format(configObj)};`
          .replace(/(\s{2,}|\r?\n)/g, ' ')
          .trim();

        stream.write(content);
        stream.end();
        stream.on('finish', resolve);
      });
    });

    it(testMessages.parseConfig[0], async function () {
      await assert.doesNotReject(async () => {
        await config.parseConfig(tempFile, false);
      });
    });

    it(testMessages.parseConfig[1], async function () {
      await assert.doesNotReject(async () => {
        await config.parseConfig(tempFile);
      });
    });

    it(testMessages.parseConfig[2], async function () {
      const configFile = (process.platform !== 'win32')
        ? tempFile.replace('/', '\\') : tempFile;
      const processStub = global.process;
      global.process = { platform: 'win32' };

      try {
        await config.parseConfig(configFile);
      } catch (err) {
        assert.fail(err);
      } finally {
        global.process = processStub;
      }
    });

    it(testMessages.parseConfig[3], async function () {
      await assert.rejects(async () =>
        await config.parseConfig('unknown and inexistence conf file.config.mjs')
      );
    });

    after(function () {
      if (fs.existsSync(tempFile)) fs.rmSync(tempFile);
    });
  });

  describe('#resolveConfig', function () {
    it(testMessages.resolveConfig[0], function () {
      assert.doesNotThrow(() => config.resolveConfig({
        config: {
          downloadOptions: {
            converterOptions: {
              format: 'wav',
              deleteOld: true
            }
          }
        }
      }));
    });

    it(testMessages.resolveConfig[1], function () {
      [ null, undefined, false ].forEach((cfg) =>
        assert.deepStrictEqual(config.resolveConfig({ config: cfg }), {}));
    });
  });

  describe('#configChecker', function () {
    let file;

    before(function () {
      file = path.join(path.dirname(tempFileNoExt), 'example.config.mjs');
    });

    it(testMessages.configChecker[0], function () {
      [ null, 5, '_' ].forEach((cfg) =>
        assert.throws(() =>
          config.configChecker({ config: cfg, file })), InvalidTypeError);
    });

    it(testMessages.configChecker[1], function () {
      const cfg = { foo: false };
      assert.throws(() =>
        config.configChecker({ config: cfg, file }), UnknownOptionError);
    });

    it(testMessages.configChecker[2], function () {
      const configs = [
        { downloadOptions: true },
        { audioConverterOptions: '0123' }
      ];
      configs.forEach((cfg) => {
        assert.throws(() =>
          config.configChecker({ config: cfg, file }), InvalidTypeError);
      });
    });
  });

  describe('#findGlobalConfig', function () {
    let searchDir;
    let globalConfigs = ['ytmp3-js.config.mjs', 'ytmp3.config.js', 'ytmp3-js.json'];
    let statStub;

    before(async function () {
      statStub = fs.promises.stat;
      searchDir = path.join(utils.ROOTDIR, 'tmp', 'configs');
      globalConfigs = globalConfigs.map((cfg) => path.join(searchDir, cfg));
      await utils.createDirIfNotExist(searchDir);

      // Create empty config files except for JSON config
      // "ytmp3-js.json" file is have a low priority
      for (const cfg of globalConfigs) {
        const content = !/ytmp3-js.json$/.test(cfg) ? '' : JSON.stringify({
          downloadOptions: { convertAudio: true }
        });
        await fs.promises.writeFile(cfg, content, { encoding: 'utf8' });
      }
    });

    it(testMessages.findGlobalConfig[0], async function () {
      const searchedGlobConfig = await config.findGlobalConfig(searchDir);

      assert.notStrictEqual(searchedGlobConfig, null)
      assert.ok(fs.existsSync(searchedGlobConfig));
      assert.notStrictEqual(fs.statSync(searchedGlobConfig).size, 0);
    });

    it(testMessages.findGlobalConfig[1], async function () {
      const result = await config.findGlobalConfig(
        path.join(utils.ROOTDIR, 'README.md')  // Must be an existence file
      );
      assert.strictEqual(result, null);
    });

    it(testMessages.findGlobalConfig[2], async function () {
      const err = new Error('Permission denied');
      err.errno = -13;
      err.code = 'EACCES';
      err.syscall = 'stat';
      err.path = searchDir;

      fs.promises.stat = async (f) => {
        throw err;
      }

      await assert.rejects(() => config.findGlobalConfig(searchDir), err);
    });

    after(function () {
      fs.promises.stat = statStub;
      if (fs.existsSync(searchDir)) fs.rmSync(searchDir, { recursive: true });
    });
  });
  
  describe('#parseGlobalConfig', function () {
    let exampleGlobalConfigDir;
    let exampleGlobalConfig;
    let exampleInvalidGlobalConfig;
    let exampleGlobalConfigWO;
    let configs;

    before(async function () {
      exampleGlobalConfigDir = getTempPath(path.join(utils.ROOTDIR, 'tmp'), 25);
      exampleGlobalConfig = path.join(exampleGlobalConfigDir, 'ytmp3-js-test.json');
      exampleGlobalConfigWO = path.join(exampleGlobalConfigDir, 'ytmp3-js-test-write-only.js');
      exampleInvalidGlobalConfig = path.join(exampleGlobalConfigDir, 'ytmp3-test-invalid.cjs');

      configs = {
        _: {
          downloadOptions: {
            cwd: os.homedir(),
            outDir: 'downloads',
            convertAudio: false,
            converterOptions: false,
            quiet: true
          }
        },
        expected: {
          cwd: os.homedir(),
          outDir: path.join(os.homedir(), 'downloads'),  // Relative to 'cwd'
          convertAudio: false,
          converterOptions: audioconv.defaultOptions,
          quiet: true
        }
      }

      await utils.createDirIfNotExist(exampleGlobalConfigDir);

      // Create a fake global config file in temporary directory
      await fs.promises.writeFile(exampleGlobalConfig, JSON.stringify(configs._), {
        encoding: 'utf8'
      });

      // Create a write-only configuration file
      await fs.promises.writeFile(exampleGlobalConfigWO, '', { encoding: 'utf8' });
      await fs.promises.chmod(exampleGlobalConfigWO, 200);  // write-only

      // Create an invalid global config file
      await fs.promises.writeFile(exampleInvalidGlobalConfig,
        `'use strict'; module.exports = ${JSON.stringify({
          // This configuration is invalid because the download options was declared
          // outside the `downloadOptions` field
          outDir: 'downloads/music',  // Error
          convertAudio: true,         // Error
          audioConverterOptions: {    // No error
            format: 'mp4',
            bitrate: 320
          }
        })};`.trim(), { encoding: 'utf8' });
    });

    it(testMessages.parseGlobalConfig[0], async function () {
      let actualConfig;
      await assert.doesNotReject(async () => {
        actualConfig = await config.parseGlobalConfig(exampleGlobalConfig);
      });
      assert.deepStrictEqual(actualConfig, configs.expected);
    });
  
    it(testMessages.parseGlobalConfig[1], async function () {
      await assert.rejects(() =>
        config.parseGlobalConfig(exampleInvalidGlobalConfig), UnknownOptionError);
    });

    it(testMessages.parseGlobalConfig[2], async function () {
      await assert.rejects(async () => {
        // On Windows system, it would not rejects because the file is still readable
        await config.parseGlobalConfig(exampleGlobalConfigWO);
        // Throw an error for Windows only
        if (process.platform === 'win32') {
          throw new GlobalConfigParserError('Known rejection error: ' + process.platform);
        }
      }, GlobalConfigParserError);
    });

    it(testMessages.parseGlobalConfig[3], async function () {
      await assert.rejects(() =>
        config.parseGlobalConfig(exampleGlobalConfig, [ 'hello world' ]), InvalidTypeError);
    });

    it(testMessages.parseGlobalConfig[4], async function () {
      await assert.rejects(() =>
        config.parseGlobalConfig([ exampleInvalidGlobalConfig ]), InvalidTypeError);
    });

    after(function () {
      if (fs.existsSync(exampleGlobalConfigDir)) {
        fs.rmSync(exampleGlobalConfigDir, { recursive: true });
      }
    });
  });

  after(function () {
    if (fs.existsSync(path.dirname(tempFileNoExt))) {
      fs.rmSync(path.dirname(tempFileNoExt), { recursive: true });
    }
  });
});
