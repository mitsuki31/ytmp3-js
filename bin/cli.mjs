#!/usr/bin/env node

/**
 * @file Main binary module for **YTMP3** project to download YouTube audios using CLI.
 *
 * @requires  utils
 * @requires  ytmp3
 * @requires  bin/argparser
 * @requires  runtime/pre-setup
 * @requires  runtime/pre-exit
 * @author    Ryuu Mitsuki <{@link https://github.com/mitsuki31}>
 * @license   MIT
 * @since     0.1.0
 */

/* global process, setImmediate, URL, console */

// ! WARN: CALL PRE-SETUP FIRST BEFORE SETUP FROM THIS MODULE
import * as __presetup from '../lib/runtime/pre-setup.js';
const presetupStatus = __presetup.setupAll();


import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import { EOL } from 'node:os';
import { promisify, inspect } from 'node:util';
import {
  getTempPath,
  createTempPath as _createTempPath
} from '@mitsuki31/temppath';

import __utils from '../lib/utils/index.js';
import * as __env from '../lib/env.js';
import cleanUp from '../lib/runtime/pre-exit.js';

const __argparser = await presetupStatus.then(async () => {
  return await import('./argparser.js');
});

const createTempPath = promisify(_createTempPath);

const { Logger, captureStdoutSync, colors: { style: $c } } = __utils;
const {
  initParser,
  filterOptions
} = __argparser;
const { getGlob } = __env;

const log = getGlob('logger', Logger);
const {
  versionStr,
  copyright: copyrightStr,
  dependencies: pkgDeps,
} = getGlob('$__metadata__$', {});
const LOG_FILE = getGlob('logFile', null);
const NO_COLOR = getGlob('noColor', false);

const TEMPDIR = path.join(path.dirname(getTempPath()), 'ytmp3-js');
const DEFAULT_BATCH_FILE = path.join(import.meta.dirname, 'downloads.txt');

/** Store the file path of cached multiple download URLs. */
let tempBatchFile = null;
let argparser = null;
let error = null;

// Import ytmp3-js module only after this module imports
import ytmp3 from '../lib/ytmp3.js';
import { ArgumentError, ArgumentTypeError } from 'argparse';


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
  return new Promise(resolve => {
    process.nextTick(() => stream.close(() => resolve(tempFile)));
  });
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
    log.info('Cleaning up temporary file ...');
    // Delete the parent directory of the cache file
    await fs.promises.rm(path.dirname(tempBatchFile), { recursive: true, force: true });
  }
  return true;
}

function printHeader() {
  const hasColumns = typeof log.stdout?.columns === 'number' && log.stdout.columns > 0;
  const totalWidth = hasColumns ? log.stdout.columns : 82;
  const version = util.stripVTControlCharacters(versionStr.trimEnd()).replace(/(\[|\])/g, '');
  const useEquals = totalWidth / 1.5 > 72;

  const centerText = `Starting ${version}`;
  const textWithSpaces = ` ${centerText} `;
  const equalsLength = Math.max(2, Math.floor((totalWidth - textWithSpaces.length) / 2));

  const leftEquals = useEquals ? '='.repeat(equalsLength / 3 + 1) : '';
  const rightEquals = useEquals
    ? '='.repeat((totalWidth - (leftEquals.length + textWithSpaces.length)) / 3.1)
    : '';

  log.line();
  log.info(`${$c([0, 'BG'], leftEquals)}${$c([0, '^', 'BC'], textWithSpaces)}${$c([0, 'BG'], rightEquals)}`);
  log.line();
}

/**
 * Main function.
 * @private
 * @since   1.0.0
 */
async function main() {
  log.debug('Building the command-line argument parser ...');
  argparser = initParser();
  const argv = process.argv.slice(2);
  log.debug(`Using arguments: ${inspect(argv.join(' '), {
    compact: false,
    colors: true
  })}`);
  log.debug('Filtering user arguments ...');
  const {
    urls,
    batchFile,
    help,
    version,
    copyright,
    parsedOptions,
    parsedOptionsAll,
    printConfig,
    printConfigAll,
  } = await filterOptions({ options: argparser.parse_intermixed_args() });

  const HELP = captureStdoutSync(() => argparser.print_help());

  // Help
  if (help) {
    process.stdout.write(HELP);
    LOG_FILE && log.write(HELP, '');
    return;
  }
  // Version
  if (version === 1) {
    process.stdout.write(versionStr);
    LOG_FILE && log.write(versionStr, '');
    return;
  } else if (version >= 2) {
    // If got '-VV' or '--version --version', then verbosely print this module
    // version and all dependencies' version
    const deps = Object.keys(pkgDeps);
    process.stdout.write(versionStr);
    LOG_FILE && log.write(versionStr, '');
    for (const dep of deps) {
      const realpathDep = path.join(import.meta.dirname, '..', 'node_modules', dep);
      const str = `\x1b[1m  ${
        ((deps.indexOf(dep) !== deps.length - 1) ? '├── ' : '└── ')
      }${dep} :: v${
        JSON.parse(fs.readFileSync(realpathDep + '/package.json'))?.version
          ?? pkgDeps[dep].replace(/^./, '')
      }\x1b[0m\n`;
      process.stdout.write(str);
      LOG_FILE && log.write(str, '');
    }
    return;
  }
  // Copyright
  if (copyright) {
    log.write(copyrightStr, '');
    return;
  }
  // Print configuration
  if (printConfig && !printConfigAll) {
    log.write(inspect(parsedOptions, { colors: !NO_COLOR, compact: false }) + '\n', '');
    return;
  }
  if (printConfigAll) {
    log.write(inspect(parsedOptionsAll, { colors: !NO_COLOR, compact: false }) + '\n', '');
    return;
  }

  // Send internet connectivity status to user
  const connected = getGlob('hasConnectivity', false);
  const w = [(connected ? 'connected' : 'disconnected'), (connected ? 'to' : 'from')];
  log.info(
    `Device has been ${$c([0, (connected ? 'BG' : 'BR')], w[0])} ${w[1]} the internet provider`);

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
        return;
      }
      log.info('\x1b[95mMode: \x1b[97mBatch Download\x1b[0m');
      downloadSucceed = !!(await ytmp3.batchDownload(
        DEFAULT_BATCH_FILE, parsedOptionsAll));
    } else if ((!urls || (urls && !urls.length)) && batchFile) {
      log.info('\x1b[95mMode: \x1b[97mBatch Download\x1b[0m');
      downloadSucceed = !!(await ytmp3.batchDownload(batchFile, parsedOptionsAll));
    } else if (urls.length && !batchFile) {
      if (Array.isArray(urls) && urls.length > 1) {
        log.info('\x1b[95mMode: \x1b[97mMultiple Downloads\x1b[0m');
        tempBatchFile = await createTempFile(urls);
        log.info('Created a temporary file:\x1b[93m',
          path.basename(tempBatchFile), '\x1b[0m');
        downloadSucceed = !!(await ytmp3.batchDownload(tempBatchFile, parsedOptionsAll));
      } else {
        log.info('\x1b[95mMode: \x1b[97mSingle Download\x1b[0m');
        downloadSucceed = !!(await ytmp3.download(urls[0], parsedOptionsAll));
      }
    }
  } catch (dlErr) {
    log.error(dlErr.message);
    if (!error) error = dlErr;
    LOG_FILE
      && console.error(dlErr.message);  // We'll always send the error message to stderr even log file used
    return;
  } finally {
    await deleteTempFile();
  }

  if (downloadSucceed) {
    log.info(`Downloaded files saved at \x1b[93m${parsedOptionsAll.outDir}\x1b[0m`);
  }
}


async function driverFunc() {
  printHeader();

  // Before execute the main function, attach clean up hooks to several signals
  log.debug('Attaching clean up hooks into termination signals ...');
  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.prependOnceListener(signal, async function ytmp3CleanUp() {
      if (signal === 'SIGINT') {
        process.stdout.write('\u001b[2K\r');
        log.warn(`${$c([0, '^', 'BB'], '<Ctrl-C>')} has been pressed, interrupting ...`);
      }
      log.line();
      await cleanUp().then(() => process.exit(signal));
    });
  });

  try {
    await main();
  } catch (err) {
    error = err instanceof Error ? err : error;
    log.error(err.message);
    // Do not log the error stack if the error is from argument parser
    if (!(err instanceof ArgumentError || err instanceof ArgumentTypeError)) {
      err.stack && log.error('Error stack: ' + util.inspect(
        err.stack.split('\n').slice(1).map(e => e.replace(/[ ]{2,}/g, '').trim()),
        { colors: true, compact: false }
      ));
    }
  }

  if (error instanceof Error) {
    const stack = (error.stack ?? '')
      .split('\n')
      .slice(1)
      .map(str => str.replace(/[ ]{2}/g, '').trim());

    log.line();
    log.error($c([0, '^', 'BR'], 'Last known error:'));
    if (!(error instanceof ArgumentError || error instanceof ArgumentTypeError)) {
      log.error(util.format(
        $c([0, 'BR'], `${error.message}: `) + '%s',
        util.inspect(
          { ...error, message: error.message, stack },
          { colors: true, compact: false }
        )
      ));
    } else {
      log.error($c([0, 'BR'], `${error.name}: ${error.message}`));
      const usage = captureStdoutSync(() => {
        argparser.print_usage();
      });
      log.write($c([0, '^'], usage), '', log.stderr);
    }
  }

  log.line();
  await cleanUp().then(() => { // ! NOTE: IT IS MANDATORY TO CALL THIS FUNCTION BEFORE EXIT
    log.info('Exiting application ...');
    process.exit(Number(error?.errno ?? !!error));
  });
}


if (import.meta.url === process.argv[1]
    || import.meta.url === new URL(process.argv[1], 'file://').href) {
  (async () => await driverFunc())();
}

