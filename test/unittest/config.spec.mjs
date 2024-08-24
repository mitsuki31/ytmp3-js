import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { format } from 'node:util';
import { tmpdir } from 'node:os';

import config from '../../lib/config.js';
import utils from'../../lib/utils.js';
import error from '../../lib/error.js';
const { UnknownOptionError } = error;

describe('module:config', function () {
  const testMessages = {
    importConfig: [
      'should parse and resolve the JSON configuration file',
      'should parse and resolve the ES Module configuration file',
      'should parse and resolve the CommonJS configuration file',
      'should throw `TypeError` when configuration file path is not a string',
      'should throw `Error` if configuration file extension are unknown'
    ],
    parseConfig: [
      'should validate only the configuration file',
      'should validate and resolve the configuration file'
    ],
    resolveConfig: [
      'should resolve audio conversion options from `converterOptions` field',
      'should return an empty object when specified configuration with nullable value'
    ],
    configChecker: [
      'should throw `TypeError` if the given config is not an object',
      'should throw `UnknownOptionError` when found unknown download options',
      'should throw `TypeError` if any known options is not an object type'
    ]
  };
  let tempFileNoExt;
  let configObj;
  let expectedResolvedConfig;

  before(function () {
    tempFileNoExt = path.join(
      tmpdir(), 'config@unittest',
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
      }, TypeError);
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
        assert.throws(() => config.configChecker({ config: cfg, file })));
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
          config.configChecker({ config: cfg, file }), TypeError);
      });
    });
  });

  after(function () {
    if (fs.existsSync(path.dirname(tempFileNoExt))) {
      fs.rmSync(path.dirname(tempFileNoExt), { recursive: true });
    }
  });
});
