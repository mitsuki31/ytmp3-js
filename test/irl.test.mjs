/* eslint-disable mocha/no-setup-in-describe */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getTempPath } from '@mitsuki31/temppath';

import audioconv from '../lib/audioconv.js';
import ytmp3 from '../lib/ytmp3.js';
import utils from '../lib/utils.js';

describe('IRL (In Real Life) Test', function () {
  console.log('\x1b[33mCAUTION! Data charge may apply.\x1b[0m');

  const videoIDs = [
    'Z0z5mNPODrc',
    'XFkzRNyygfk',
    'jTVG5kdHRQQ'
  ];
  const outDir = getTempPath(path.join(utils.ROOTDIR, 'tmp'), 15);
  const outputFiles = {};

  describe('Downloading and converting some YouTube videos to MP3 format', function () {
    console.log('Please wait for a while...');

    for (const id of videoIDs) {
      it(id, async function () {
        this.timeout(1000 * 60 * 13);  // Give 13 minutes
        this.slow(1000 * 60 * 5);  // 5 minute

        outputFiles[id] = await ytmp3.singleDownload(`https://youtu.be/${id}`, {
          outDir,
          convertAudio: false,
          quiet: true
        });

        assert.ok(fs.existsSync(outputFiles[id]));

        await audioconv.convertAudio(outputFiles[id], {
          format: 'mp3',
          codec: 'libmp3lame',
          deleteOld: false,
          quiet: true
        });

        assert.ok(fs.existsSync(outputFiles[id]));
        assert.ok(fs.existsSync(outputFiles[id].replace(/\.m4a$/, '.mp3')));
      });
    }
  });

  after(function () {
    try {
      if (fs.existsSync(outDir)) {
        fs.rmSync(path.dirname(outDir), { recursive: true });
      }
    } catch (err) {
      if ('code' in err && err.code === 'EBUSY') {
        setTimeout(() => {
          if (fs.existsSync(outDir)) fs.rmSync(outDir, { recursive: true });
        }, 1000 * 3);  // Wait for 3 seconds
      } else {
        throw err;
      }
    }
  });
});
