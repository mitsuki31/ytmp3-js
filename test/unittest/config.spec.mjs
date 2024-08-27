/* eslint-disable mocha/no-setup-in-describe */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import config from '../../lib/config.js';
import utils from '../../lib/utils.js';

describe('module:config', function () {
  const testMessages = {
    importConfig: [
      'should parse and resolve the given configuration file'
    ]
  };
  const tempFile = path.join(utils.ROOTDIR, 'tmp', 'tempTestConfig.json');
  const configObj = {
    downloadOptions: {
      cwd: null,
      outDir: path.join('tmp', 'downloads'),
    },
    audioConverterOptions: {
      format: 'opus',
      codec: 'libopus',
      frequency: 12000,
      channels: 1
    }
  };
  const expectedResolvedConfig = {
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

  before(async function () {
    if (!fs.existsSync(path.dirname(tempFile))) {
      fs.mkdirSync(path.dirname(tempFile));
    }
    const stream = fs.createWriteStream(tempFile, { flush: true });

    // Required to ensure that the stream are closed
    // before the JSON file being parsed
    return new Promise((resolve) => {
      stream.write(JSON.stringify(configObj));
      stream.close(resolve);
    });
  });

  describe('#importConfig', function () {
    it(testMessages.importConfig[0], async function () {
      const resolvedConfig = await config.importConfig(tempFile);
      assert.ok(resolvedConfig !== null);
      assert.ok(typeof resolvedConfig !== 'undefined');
      assert.deepStrictEqual(resolvedConfig, expectedResolvedConfig);
    });
  });

  after(function () {
    if (fs.existsSync(tempFile)) fs.rmSync(tempFile);
  });
});
