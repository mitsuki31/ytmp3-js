#!/usr/bin/env node

/**
 * @file Main binary module for **YTMP3** project to download YouTube audios using CLI.
 *
 * @requires  utils
 * @requires  ytmp3
 * @requires  bin/argparser
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     0.1.0
 */

'use strict';

const fs = require('fs');      // File system module
const path = require('path');  // Path module
const { EOL } = require('os');
const { promisify } = require('util');
const {
  getTempPath,
  createTempPath: _createTempPath
} = require('@mitsuki31/temppath');
const createTempPath = promisify(_createTempPath);

const { logger: log } = require('../lib/utils');
const ytmp3 = require('../lib/ytmp3');
const pkg = require('../package.json');
const {
  __version__,
  __copyright__,
  initParser,
  filterOptions
} = require('./argparser');


const TEMPDIR = path.join(path.dirname(getTempPath()), 'ytmp3-js');
const DEFAULT_BATCH_FILE = path.join(__dirname, 'downloads.txt');

/** Store the file path of cached multiple download URLs. */
let tempBatchFile = null;


/**
 * Creates a cache file for URLs to be downloaded.
 *
 * This function creates a temporary file in the system's temporary directory
 * containing a list of URLs to be downloaded using the
 * {@link module:ytmp3~batchDownload `ytmp3.batchDownload`} function.
 *
 * @param {string[]} urls - URLs to be written to cache file
 * @returns {Promise<string>} The path to the cache file for later deletion
 *
 * @private
 * @since   1.0.0
 */
async function createTempFile(urls) {
  const tempFile = await createTempPath(TEMPDIR, {
    asFile: true,
    ext: 'dl',
    maxLen: 20
  });
  // Create write stream for cache file
  const stream = fs.createWriteStream(tempFile);

  await new Promise(resolve => {
    const copyUrls = urls.map(url => {
      return /^https?:\/\//.test(url) ? url : `https://youtu.be/${url}`;
    });

    setImmediate(() => {
      // Write URLs to cache
      copyUrls.forEach(url => stream.write(`${url}${EOL}`));
      resolve();
    });
  });

  // Close the write stream at the next tick
  process.nextTick(() => stream.end());
  return tempFile;
}

/**
 * Deletes the cache file if it exists
 *
 * @returns {Promise<boolean>} `true` if the cache file is deleted successfully
 * @private
 * @since    1.0.0
 */
async function deleteTempFile() {
  if (!tempBatchFile) return false;
  if (fs.existsSync(tempBatchFile)) {
    // Delete the parent directory of the cache file
    await fs.promises.rm(path.dirname(tempBatchFile), { recursive: true, force: true });
  }
  return true;
}

/**
 * Main function.
 * @private
 * @since   1.0.0
 */
async function main() {
  const {
    urls,
    batchFile,
    version,
    copyright,
    downloadOptions,
    printConfig
  } = await filterOptions({
    options: initParser().parse_intermixed_args()
  });

  // Version
  if (version === 1) {
    process.stdout.write(__version__);
    return;
  } else if (version >= 2) {
    // If got '-VV' or '--version --version', then verbosely print this module
    // version and all dependencies' version
    const deps = Object.keys(pkg.dependencies);
    process.stdout.write(__version__);
    for (const dep of deps) {
      process.stdout.write(`\x1b[1m  ${
        ((deps.indexOf(dep) !== deps.length - 1) ? '├── ' : '└── ')
      }${dep} :: v${require(dep + '/package.json').version}\x1b[0m\n`);
    }
    return;
  }
  // Copyright
  if (copyright) {
    process.stdout.write(__copyright__);
    return;
  }
  // Print configuration
  if (printConfig) {
    console.log(downloadOptions);
    return;
  }

  let downloadSucceed = false;
  try {
    if ((!urls || (urls && !urls.length)) && !batchFile) {
      const defaultBatchFileBase = path.basename(DEFAULT_BATCH_FILE);
      log.info(`\x1b[2mNo URL and batch file specified, searching \x1b[93m${
        defaultBatchFileBase}\x1b[0m\x1b[2m ...\x1b[0m`);
      if (!fs.existsSync(DEFAULT_BATCH_FILE)) {
        log.error(`Cannot find \x1b[93m${
          defaultBatchFileBase}\x1b[0m at current directory`);
        log.error('Aborted');
        process.exit(1);
      }
      log.info('\x1b[95mMode: \x1b[97mBatch Download\x1b[0m');
      downloadSucceed = !!(await ytmp3.batchDownload(
        DEFAULT_BATCH_FILE, downloadOptions));
    } else if ((!urls || (urls && !urls.length)) && batchFile) {
      log.info('\x1b[95mMode: \x1b[97mBatch Download\x1b[0m');
      downloadSucceed = !!(await ytmp3.batchDownload(batchFile, downloadOptions));
    } else if (urls.length && !batchFile) {
      if (Array.isArray(urls) && urls.length > 1) {
        log.info('\x1b[95mMode: \x1b[97mMultiple Downloads\x1b[0m');
        tempBatchFile = await createTempFile(urls);
        log.info('Created a temporary file:\x1b[93m',
          path.basename(tempBatchFile), '\x1b[0m');
        downloadSucceed = !!(await ytmp3.batchDownload(tempBatchFile, downloadOptions));
      } else {
        log.info('\x1b[95mMode: \x1b[97mSingle Download\x1b[0m');
        downloadSucceed = !!(await ytmp3.download(urls[0], downloadOptions));
      }
    }
  } catch (dlErr) {
    log.error(dlErr.message);
    console.error(dlErr.stack);
    process.exit(1);
  } finally {
    await deleteTempFile();
  }

  if (downloadSucceed) {
    log.info(`Downloaded files saved at \x1b[93m${downloadOptions.outDir}\x1b[0m`);
  }
}


if (require.main === module) {
  main();
}
