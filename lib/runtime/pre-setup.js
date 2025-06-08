/**
 * @file Performs essential pre-setup routines for both CLI and library usage.
 * 
 * It is intended to be loaded early in the lifecycle, particularly
 * before logging or network-related modules are used.
 * 
 * This module is responsible for:
 * 
 * - Parsing and applying environment variables to configure runtime behavior.
 * - Validating and locating the `ffmpeg` and `ffprobe` binary on the system.
 * - Verifying internet connectivity using a DNS lookup.
 * 
 * These steps help ensure that the environment is correctly set up
 * before the rest of the application logic is executed.
 *
 * ### Environment Variables
 *
 * The following environment variables are recognized:
 * 
 * - `YTMP3__NO_COLOR` / `NO_COLOR`  
 *   Disables colored output. If either is set, colored logs will be turned off.
 * 
 * - `YTMP3__LOG_LEVEL`  
 *   Controls the verbosity of logs. Expected values: `DEBUG`, `INFO`, `WARN`, `ERROR`, `NONE`.
 * 
 * - `YTMP3__DEBUG`  
 *   Alias for `YTMP3__LOG_LEVEL=DEBUG`. If set, log level is forced to `DEBUG`.
 * 
 * - `YTMP3__LOG_FILE`  
 *   Path to a file where logs should be written, instead of or in addition to stdout.
 * 
 * - `FFMPEG_PATH`  
 *   Explicitly specify the path to the `ffmpeg` binary file. If unset, manual detection will be used.
 * 
 * @module    runtime/pre-setup
 * @requires  utils/colors
 * @requires  utils/logger
 * @requires  env
 * @requires  {@linkcode https://npmjs.com/package/which npm:which}
 * @author    Ryuu Mitsuki <{@link https://github.com/mitsuki31}>
 * @license   MIT
 * @since     2.0.0
 * @see       {@link https://no-color.org/ NO_COLOR standard}
 * @see       {@link https://ffmpeg.org/ FFmpeg documentation}
 * @see       {@link https://nodejs.org/api/dns.html Node.js DNS module}
 */

'use strict';

const dns = require('node:dns');
const fs = require('node:fs');
const path = require('node:path');
const util = require('node:util');
const https = require('https');
const { execFileSync } = require('node:child_process');
const which = require('which');

const { style: $c } = require('../utils/colors');
const Logger = require('../utils/logger');
const { setGlob, runBeforeExit, getGlob, YTMP3_SYMBOL } = require('../env');

const TRUTHY = ['true', 'TRUE', 'True', '1', 'y', 'Y', 'yes', 'YES', 'Yes'];
const FALSY = ['false', 'FALSE', 'False', '0', 'n', 'N', 'no', 'NO', 'No'];

const inspectOpts = { compact: false, colors: true };
let logFileStatus = null;  // Store a promise if the log file is specified


// Create a prototype of `ytmp3-js` property in global context
global[YTMP3_SYMBOL] = {};


function isDefined(name) {
  return typeof name !== 'undefined'
    || (typeof name === 'string' && name.trim() !== '');
}

function logError(fmt, error, logger) {
  fmt = fmt || error.message + ' %s';
  logger.error(util.format(fmt, util.inspect({ ...error }, inspectOpts)));
}

function ipToNumber(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
}

async function lookupWithTimeout(hostname, timeout = 5000) {
  const lookupPromise = dns.promises.lookup(hostname, { family: 4, all: true });
  const error = new Error(`DNS lookup timed out after ${timeout} ms`);
  error.timeout = timeout;
  error.hostname = hostname;

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(error), timeout)
  );

  return Promise.race([lookupPromise, timeoutPromise]);
}

function checkInternetViaHEAD({ url = 'https://www.youtube.com', timeout = 3500, logger }) {
  const error = new Error(`Internet check has timed out after ${timeout} ms`);
  error.timeout = timeout;
  error.url = url;

  return new Promise((resolve, reject) => {
    logger.debug(`Sending HEAD request to ${$c([0, 'C'], url)} ...`);
    const req = https.request(url, { method: 'HEAD' }, res => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', reject);
    req.setTimeout(timeout, () => {
      req.destroy();
      reject(error);
    });
    req.end();
  });
}


async function hasConnectivity({ logger }) {
  let result = false;
  let addresses = [];
  let currentDNS = dns.getServers();
  currentDNS = currentDNS.length === 1 ? currentDNS[0] : currentDNS;

  logger.debug(util.format('Current device DNS servers: %s',
    util.inspect(currentDNS, inspectOpts)
  ));

  try {
    logger.debug(`Attempting DNS lookup to ${$c([0, 'C'], 'www.youtube.com')} ...`);
    addresses = await lookupWithTimeout('www.youtube.com', 1500);

    addresses.sort((a, b) => ipToNumber(a.address) - ipToNumber(b.address));
    const addressesStr = util.inspect(addresses, { ...inspectOpts, compact: true });
    logger.debug(util.format(
      'DNS lookup succeed with result: %s',
      addressesStr.replace(/^\[\s/, '[\n  ').replace(/\s\]$/, '\n]')
    ));
    result = true;
  } catch (err) {
    if (logger.level === 'DEBUG') {  // ! WARN: These error messages will only appear on debug level
      logError('DNS lookup failed with error: %s', { message: err.message, ...err }, logger);
      logger.warn($c([0, 'BY'], 'If you are behind proxy, do not worry about this'));
    }
  }

  try {
    logger.debug('Checking internet connectivity with real test ...');
    await checkInternetViaHEAD({ logger });
  } catch (err) {
    if (logger.level === 'DEBUG') {  // ! WARN: These error messages will only appear on debug level
      logError('Internet checking has failed with error: %s', { message: err.message, ...err }, logger);
      logger.error($c([0, 'BR'], 'If you are behind proxy, please check your proxy configuration'));
    }
  }

  return result && !!addresses?.length;
}

function checkFfmpeg({ env, logger }) {
  let ffmpegPath;
  let ffmpegVersion;
  let ffprobePath;
  let hasFfmpeg = false;
  const ffmpegCmd = 'ffmpeg' + ((process.platform === 'win32') ? '.exe' : '');
  const ffprobeCmd = 'ffprobe' + ((process.platform === 'win32') ? '.exe' : '');

  function getFfmpegVersion() {
    logger.debug('Getting the FFmpeg version ...');
    let stdout = null;
    try {
      stdout = execFileSync(ffmpegPath, ['-version'], {
        encoding: 'utf8', windowsHide: true, timeout: 10 * 1000  // Wait for 10s
      });
    } catch (err) {
      logger.error(err.message);
      return null;
    }

    return stdout
      && stdout.split('\n')[0].match(/^ffmpeg\sver(sion)?\s([0-9.-]+(\w+)?)\s.+/)[2];
  }

  function whichIs(file) {
    return which.sync(file, {
      nothrow: true,
      path: env.PATH,
      pathExt: env.PATHEXT
    });
  }

  logger.debug('Checking for FFmpeg executable binary ...');

  let hasError = false;
  if (isDefined(env.FFMPEG_PATH)) {
    ffmpegPath = env.FFMPEG_PATH;
    logger.debug(`Environment ${$c([0, 'M'], 'FFMPEG_PATH')} is set to ${$c([0, 'BY'], ffmpegPath)}`);
    let ffmpegPathStat;

    try {
      ffmpegPathStat = fs.statSync(ffmpegPath);
    } catch (err) {
      hasError = !!err;
      hasFfmpeg = false;
      ffmpegPath = undefined;
      logger.level === 'DEBUG'  // ! WARN: This error message will only appear on debug level
        && logError(null, err, logger);
    }

    if (!hasError && ffmpegPathStat && ffmpegPathStat.isDirectory()) {
      ffmpegPath = path.join(ffmpegPath, ffmpegCmd);
      try {
        ffmpegPathStat = fs.statSync(ffmpegPath);
      } catch (err) {
        hasError = !!err;
        hasFfmpeg = false;
        ffmpegPath = undefined;
        logger.level === 'DEBUG'  // ! WARN: This error message will only appear on debug level
          && logError(null, err, logger);
      }

      if (!hasError && ffmpegPathStat && ffmpegPathStat.isFile()) {
        logger.debug(`Override ${$c([0, 'M'], 'FFMPEG_PATH')} and set to ${$c([0, 'BY'], ffmpegPath)}`);
      } else {
        logger.level === 'DEBUG'  // ! WARN: This warning message will only appear on debug level
          && logger.warn(`Unable to find FFmpeg executable binary: ${$c([0, 'BY'], ffmpegPath)}`);
      }
    }
  } else {
    ffmpegPath = whichIs(ffmpegCmd);
  }

  ffmpegPath = ffmpegPath && (path.isAbsolute(ffmpegPath)
    ? ffmpegPath
    : path.resolve(ffmpegPath)) || null;
  hasFfmpeg = !!ffmpegPath;
  hasError = false;  // reset

  if (hasFfmpeg) {
    // Get the ffprobe path if has ffmpeg
    ffprobePath = whichIs(ffprobeCmd);

    logger.debug(`FFmpeg executable binary path: ${$c([0, 'BY'], ffmpegPath)}`);
    logger.debug(`FFprobe executable binary path: ${$c([0, 'BY'], ffprobePath)}`);

    // Check whether the ffmpeg binary file is executable
    try {
      // On Windows, `X_OK` flag is unnecessary because as the file is readable, then it's also executable
      fs.accessSync(ffmpegPath, fs.constants.R_OK | fs.constants.X_OK);
    } catch (accessErr) {
      hasError = !!accessErr;
      accessErr.description = util.getSystemErrorMessage(accessErr.errno ?? -13);
      logger.level === 'DEBUG'  // ! WARN: This error message will only appear on debug level
        && logError('Unable to access ffmpeg executable file %s', accessErr, logger);
    }

    // Get the FFmpeg version
    if (!hasError) ffmpegVersion = getFfmpegVersion(ffmpegPath);
    if (ffmpegVersion) {
      logger.debug(`FFmpeg version ${$c([0, 'Y'], ffmpegVersion)} is installed`);
    } else {
      // Used file is not an actual ffmpeg binary
      hasFfmpeg = false;
      ffmpegPath = undefined;
      ffprobePath = undefined;
      logger.level === 'DEBUG'  // ! WARN: This warning message will only appear on debug level
        && logger.warn('Unable to get FFmpeg version, resetting FFmpeg path');
    }
  } else {
    logger.level === 'DEBUG' && logger.warn('No FFmpeg binary found on this device');
  }

  return { hasFfmpeg, ffmpegPath, ffmpegVersion, ffprobePath };
}


// region Setups

function setupLogLevel({ env = process.env }) {
  let logLevel;
  let logger = Logger.createLogger(Logger.LOG_LEVELS.INFO, {
    stdout: process.stdout,
    stderr: process.stderr
  });

  if (isDefined(env.YTMP3__LOG_LEVEL)
      && Object.keys(Logger.LOG_LEVELS).includes(env.YTMP3__LOG_LEVEL)) {
    logLevel = env.YTMP3__LOG_LEVEL;
  }
  // If the YTMP3__DEBUG is set to true, the log level will be overriden to `DEBUG`
  // It is more prioritized than `YTMP3__LOG_LEVEL`
  if (isDefined(env.YTMP3__DEBUG) && TRUTHY.includes(env.YTMP3__DEBUG)) {
    logLevel = 'DEBUG';
  }

  const usedLevel = logLevel || 'INFO';
  if (logLevel) {
    logLevel === 'DEBUG'
      && Logger.debug(`Log level set to ${$c([0, '^', 'BB'], logLevel)}`);

    // * NOTE: Make sure it does not create a new logger with similar log level as previous
    if (usedLevel !== logger.level) logger = Logger.createLogger(usedLevel);
  }

  setGlob('logLevel', usedLevel);
  setGlob('logger', logger);
}

function setupLogFile({ logLevel, env = process.env }) {
  let logger = global[YTMP3_SYMBOL].logger ?? Logger.createLogger(
    Logger.LOG_LEVELS.INFO, {
      stdout: process.stdout,
      stderr: process.stderr
    }
  );

  logger.debug('Setting up the log file ...');
  const logFile = isDefined(env.YTMP3__LOG_FILE) ? env.YTMP3__LOG_FILE : undefined;
  let logFileStream;

  if (!logFile) {
    logger.debug('No log file specified, fallback to standard streams');
    return;
  }

  const flags = (fs.existsSync(logFile) && fs.statSync(logFile).size > 0) ? 'a+' : 'w';
  logger.debug(
    `Log file is ${flags === 'w' ? 'empty' : 'not empty'} use `
    + `${$c([0, 'BC'], (flags === 'w' ? 'write' : 'append'))} mode`
  );
  let hasError = false;

  try {
    // This could throws an error if the specified log file is within system directory
    // and causing 'EACCES' (Permission denied) error
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
  } catch (err) {
    hasError = !!err;
    // ! WARN: These error messages will only appear on debug level
    if (logLevel === 'DEBUG') {
      logger.error(
        'Cannot use specified log file due to an error. Fallback to standard streams');
      logError(null, err, logger);
    }
  }

  if (!hasError) {
    logFileStream = fs.createWriteStream(logFile, { flags, flush: true });
    logFileStream.once('error', (err) => {
      // ! WARN: These error messages will only appear on debug level
      if (logLevel === 'DEBUG') {
        logger = Logger.createLogger(Logger.LOG_LEVELS.INFO, {
          stdout: process.stdout,
          stderr: process.stderr
        });
        setGlob('logger', logger);
        logger.error(
          'Cannot use specified log file due to an error. Fallback to standard streams');
        logError(null, err, logger);
      }
    });

    runBeforeExit(async function closeYTMP3LogFile() {
      logLevel === 'DEBUG' && Logger.debug('Closing log file buffer ...');
      // Attach a function to close the logger exact before Node.js process exit
      logFileStream.closed || await new Promise(resolve => logFileStream.close(() => {
        if (logLevel === 'DEBUG') {
          Logger.debug(`Log file ${$c([0, 'BY'], logFile)} has been closed`);
          Logger.debug(`${$c([0, 'Y'], logFileStream.bytesWritten)} bytes has been written`);
        }
        resolve();
      }));
    });

    logFileStatus = new Promise(resolve =>
      logFileStream.prependListener('open', resolve)
    );

    logFileStream.once('open', () => {
      let header = util.format('%s/[ YTMP3-JS LOGS ]\\%s\n',
        '='.repeat(50),
        '='.repeat(50)
      );
      // Create a new line for new logging outputs when appending log file
      if (flags.startsWith('a')) {
        header = `\n\n${header}`;
      }
      logFileStream.write(header);

      logLevel === 'DEBUG'
        && Logger.debug(`Redirecting all log outputs to ${$c([0, 'BY'], logFile)}`);
      logger = Logger.createLogger(logLevel, {
        stdout: logFileStream,
        stderr: logFileStream
      });
      setGlob('logger', logger);
      logLevel === 'DEBUG'
        && Logger.debug(`${$c([0, '^', 'BG'], 'DONE!')} Redirected log outputs to ${$c([0, 'BY'], logFile)}`);
    });
  }

  return logFile;
}

function setupProjectMetadata({ logger }) {
  logger.debug(`Retrieving project metadata from ${$c([0, 'BY'], 'package.json')} ...`);

  logger.debug("=> require('ytmp3-js/package.json')");
  const pkg = require('../../package.json');
  const versionKeys = ['major', 'minor', 'patch', 'preRelease'];
  const versionParts = (pkg.version ?? '0.0.0-dev').split(/-|\./);

  const author = {
    name: pkg.author.split(' <')[0],
    email: /<(\w+@[a-z0-9.]+)>/m.exec(pkg.author)[1],
    website: /\((https?:\/\/.+)\)/m.exec(pkg.author)[1]
  };

  const versionStr = (() => {
    // eslint-disable-next-line prefer-const
    let [ ver, rel ] = (pkg.version || '0.0.0-dev').split('-');
    rel = (rel && rel.length !== 0)
      ? rel.charAt(0).toUpperCase() + rel.substring(1)  // Capitalize first letter
      : 'Stable';
    return `\x1b[1m[${pkg.name.toUpperCase()}] v${ver} \x1b[2m${rel}\x1b[0m\n`;
  })();
  
  const version = versionKeys.reduce((acc, key, index) => {
    acc[key] = versionParts[index] ?? null;
    // If no pre-release specified in package.json, it means a stable release
    if (key === 'preRelease' && acc[key] === null) acc[key] = 'stable';
    return acc;
  }, {});

  const copyright = `${pkg.name} - Copyright (c) 2023-${
    new Date().getFullYear()} ${author.name} (${author.website})\n`;

  const metadata = Object.freeze({
    name: pkg.name,
    title: pkg.title,
    description: pkg.description,
    author,
    version,
    versionStr,
    copyright,
    homepageUrl: pkg.homepage,
    repository: pkg.repository,
    dependencies: pkg.dependencies,
    devDependencies: pkg.devDependencies,
  });
  setGlob('$__metadata__$', metadata);
}

function setupGlobalVars({ env = process.env }) {
  env = typeof env === 'object' ? env : process.env;

  const logger = getGlob('logger', Logger);

  // ::: [NO COLOR]
  const noColor = ['YTMP3__NO_COLOR', 'NO_COLOR'].reduce((acc, name) => {
    if (isDefined(env[name])) {
      if (name === 'YTMP3__NO_COLOR' && TRUTHY.includes(env[name])) env.NO_COLOR = env[name];
      if (!acc && TRUTHY.includes(env[name])) acc = !acc;
    }
    return acc;
  }, false);

  // ::: [HAS FFMPEG]
  const {
    hasFfmpeg,
    ffmpegPath,
    ffmpegVersion,
    ffprobePath
  } = checkFfmpeg({ env, logger });
  logger.debug('Updating FFMPEG_PATH environment variable ...');
  env.FFMPEG_PATH = hasFfmpeg ? ffmpegPath : env.FFMPEG_PATH;
  env.FFPROBE_PATH = hasFfmpeg ? ffprobePath : env.FFPROBE_PATH;
  logger.level === 'DEBUG' && logger.line();

  Object.assign(global, {
    [YTMP3_SYMBOL]: {
      ...global[YTMP3_SYMBOL],
      // Indicates that the setup has done, reassigned in `setupAll`
      ready: false,
      // Represents a string path refer to FFmpeg executable binary file
      ffmpegPath,
      // A string representing the version of FFmpeg
      ffmpegVersion,
      // Represents a string path refer to FFprobe executable binary file
      ffprobePath,
      // Indicates the device has internet connectivity (does not guarantee it has full internet access)
      hasConnectivity: hasConnectivity({ logger }),
      // Indicates the device has installed the FFmpeg binaries
      hasFfmpeg,
      // Indicates the log outputs to use no color
      noColor,
    }
  });

  const notEnumerableGlobals = [
    ['logger', getGlob('logger', logger)],
    ['__onExit', getGlob('__onExit', [])]
  ];

  notEnumerableGlobals.forEach(map => {
    Object.defineProperty(global[YTMP3_SYMBOL], map[0], {
      writable: true,
      configurable: true,
      enumerable: false,
      value: map[1]
    });
  });
}

/**
 * @param {object} params
 * @param {NodeJS.ProcessEnv | object} [env]
 * @returns {Promise<void>}
 */
async function setupAll({ env = process.env } = {}) {
  env = typeof env === 'object' ? env : process.env;

  setupLogLevel({ env });

  const logFile = setupLogFile({
    logLevel: getGlob('logger').level,
    env
  });
  if (logFileStatus) logFileStatus = await logFileStatus;

  setupProjectMetadata({ logger: getGlob('logger', Logger) });
  setupGlobalVars({ env });
  const connected = await getGlob('hasConnectivity');

  setGlob('logFile', logFile);
  setGlob('useStdStream', !logFile);
  setGlob('hasConnectivity', connected);
  setGlob('ready', true);
  getGlob('logger').debug(`${$c([0, '^', 'BG'], 'DONE!')} Setup completed!`);
}


module.exports = {
  TRUTHY,
  FALSY,
  setupLogLevel,
  setupLogFile,
  setupGlobalVars,
  setupAll
};

