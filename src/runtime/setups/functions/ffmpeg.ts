import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import { execFileSync } from 'node:child_process';
import which from 'which';

import { type Logger, NoneLogger, DefaultLogger, LogLevel, isDefined, isString, style as $c } from '#/utils/index.js';
import { logError } from '#/utils/diag/index.js';
import { getGlob, getSystemEnv, setGlob, hasSetup } from '#runtime/env.js';
import { getStatus, setStatus } from '../constants.js';

export default function init({ logger }: { logger?: Logger }) {
  // * Setup guard
  if (getStatus('ffmpeg')) return;

  if (!hasSetup()) {
    DefaultLogger.error('FFmpeg setup failed: Application has not been initialized yet.');
    return;
  }

  if (!logger) logger = getGlob('logger', NoneLogger);

  let ffmpegPath: string | undefined;
  let ffmpegVersion: string | undefined;
  let ffprobePath: string | undefined;
  let ffprobeVersion: string | undefined;
  let hasFfmpeg = false;
  const isDebugMode = logger.level === LogLevel.DEBUG;

  // This detection will never be a problem in WSL
  // the `process.platform` will set to the 'linux' (or similar) instead of 'win32'
  const ffmpegCmd = 'ffmpeg' + ((process.platform === 'win32') ? '.exe' : '');
  const ffprobeCmd = 'ffprobe' + ((process.platform === 'win32') ? '.exe' : '');

  logger.debug('Getting the FFmpeg and FFprobe paths from environment ...');
  const FFMPEG_PATH = getSystemEnv('FFMPEG_PATH');
  const FFPROBE_PATH = getSystemEnv('FFPROBE_PATH');

  function getVersion(execPath: string): string | null {
    const baseFile = path.basename(execPath, process.platform === 'win32' ? '.exe' : undefined);
    const versionRegex = new RegExp(`^${baseFile}\\sver(sion)?\\s([0-9.-]+(\\w+)?)\\s.+`);

    logger?.debug(`Getting the ${baseFile} version ...`);

    let stdout: string | null = null;
    try {
      stdout = execFileSync(execPath, ['-version'], {
        encoding: 'utf8', windowsHide: true, timeout: 10 * 1000  // Wait for 5s
      });
    } catch (err) {
      if (err instanceof Error) logError(null, err, DefaultLogger);
      return null;
    }

    if (isString(stdout)) {
      const firstLine = stdout.split('\n')[0];
      const match = firstLine.match(versionRegex);
      return match ? match[2] : null;
    }

    return null;
  }

  function whichIs(file: string): string | null {
    logger?.debug('Searching for', path.basename(file), '...');
    return which.sync(file, {
      nothrow: true,
      path: process.env.PATH,
      pathExt: process.env.PATHEXT
    });
  }

  logger.debug('Checking for FFmpeg executable binary ...');

  let hasError = false;
  if (isDefined(FFMPEG_PATH)) {
    ffmpegPath = FFMPEG_PATH;
    logger.debug(`Environment ${$c([0, 'M'], 'FFMPEG_PATH')} is set to ${$c([0, 'BY'], ffmpegPath as string)}`);
    let ffmpegPathStat;

    try {
      ffmpegPathStat = fs.statSync(ffmpegPath as string);
    } catch (err) {
      if (err instanceof Error) {
        hasError = !!err;
        hasFfmpeg = false;
        ffmpegPath = undefined;
        if (isDebugMode)  // ! WARN: This error message will only appear on debug level
          logError(null, err, logger);
      }
    }

    // If the FFmpeg path is a directory, search for FFmpeg executable binary inside the directory
    if (!hasError && ffmpegPathStat && ffmpegPathStat.isDirectory()) {
      logger.debug('FFmpeg path is a directory, searching for FFmpeg executable binary ...');
      ffmpegPath = path.join(ffmpegPath as string, ffmpegCmd);

      try {
        ffmpegPathStat = fs.statSync(ffmpegPath);
      } catch (err) {
        if (err instanceof Error) {
          hasError = !!err;
          hasFfmpeg = false;
          ffmpegPath = undefined;
          if (isDebugMode)  // ! WARN: This error message will only appear on debug level
            logError(null, err, logger);
        }
      }

      if (!hasError && ffmpegPathStat && ffmpegPathStat.isFile()) {
        logger.debug(`Override ${$c([0, 'M'], 'FFMPEG_PATH')} and set to ${$c([0, 'BY'], ffmpegPath as string)}`);
      } else {
        if (isDebugMode)  // ! WARN: This warning message will only appear on debug level
          logger.warn(`Unable to find FFmpeg executable binary: ${$c([0, 'BY'], ffmpegPath as string)}`);
      }
    }
  } else {
    ffmpegPath = whichIs(ffmpegCmd) || undefined;
  }

  ffmpegPath = isString(ffmpegPath) ? (path.isAbsolute(ffmpegPath)
    ? ffmpegPath
    : path.resolve(ffmpegPath as string)) : undefined;
  hasFfmpeg = !!ffmpegPath;
  hasError = false;  // reset

  // If has FFmpeg executable binary, check also for FFprobe executable binary
  if (hasFfmpeg && isString(ffmpegPath)) {
    // Check whether the ffmpeg binary file is executable
    try {
      // On Windows, `X_OK` flag is unnecessary because as the file is readable, then it's also executable
      fs.accessSync(ffmpegPath, fs.constants.R_OK | fs.constants.X_OK);
    } catch (accessErr) {
      if (accessErr instanceof Error) {
        const err: NodeJS.ErrnoException & { description?: string } = accessErr;
        hasError = !!err;
        // Reset all values
        hasFfmpeg = false;
        ffmpegPath = undefined;
        ffprobePath = undefined;

        err.description = util.getSystemErrorMessage(err.errno ?? -13);
        if (isDebugMode)  // ! WARN: This error message will only appear on debug level
          logError('Unable to access ffmpeg executable file %s', err, logger);
      }
    }
  }

  if (!hasError && hasFfmpeg && isString(ffmpegPath)) {
    // Get the ffprobe path if has ffmpeg
    ffprobePath = isDefined(FFPROBE_PATH) ? FFPROBE_PATH : (whichIs(ffprobeCmd) || undefined);

    // Get the FFmpeg version
    logger.debug(`FFmpeg executable binary path: ${$c([0, 'BY'], ffmpegPath)}`);
    ffmpegVersion = getVersion(ffmpegPath) || undefined;

    if (isString(ffmpegVersion)) {
      logger.debug(`FFmpeg version ${$c([0, 'Y'], ffmpegVersion)} is installed`);
    } else {
      // Used file is not an actual ffmpeg binary
      hasFfmpeg = false;
      ffmpegPath = undefined;
      if (isDebugMode)  // ! WARN: This warning message will only appear on debug level
        logger.warn('Unable to get FFmpeg version, resetting FFmpeg path');
    }

    // Get the FFprobe version
    if (isString(ffprobePath)) {
      logger.debug(`FFprobe executable binary path: ${$c([0, 'BY'], ffprobePath)}`);
      ffprobeVersion = getVersion(ffprobePath) || undefined;
      if (isString(ffprobeVersion)) {
        logger.debug(`FFprobe version ${$c([0, 'Y'], ffprobeVersion)} is installed`);
      } else {
        // If the ffprobe live in the same directory with ffmpeg
        // treat it as a valid ffprobe path
        if (path.dirname(ffmpegPath as string) === path.dirname(ffprobePath as string)) {
          ffprobeVersion = ffmpegVersion;
          if (isDebugMode)  // ! WARN: This warning message will only appear on debug level
            logger.warn('Unable to get FFprobe version, treating it as one package with FFmpeg');
        } else {
          ffprobePath = undefined;
          if (isDebugMode)  // ! WARN: This warning message will only appear on debug level
            logger.warn('Unable to get FFprobe version, resetting FFprobe path');
        }
      }
    }
  }

  if (hasFfmpeg && isString(ffmpegPath)) {
    setGlob('ffmpeg', {
      path: ffmpegPath as string,
      version: ffmpegVersion as string
    });

    if (isString(ffprobePath)) {
      setGlob('ffprobe', {
        path: ffprobePath as string,
        version: ffprobeVersion as string
      });
      process.env.FFPROBE_PATH = ffprobePath;  // Set FFprobe path
    }
    process.env.FFMPEG_PATH = ffmpegPath;      // Set FFmpeg path
  } else {
    if (isDebugMode) logger.warn('FFmpeg is either not installed or cannot be found on the system');
    setGlob('ffmpeg', undefined);
    setGlob('ffprobe', undefined);
  }

  setGlob('env', {
    ...getGlob('env', {}),
    FFMPEG_PATH: ffmpegPath,
    FFPROBE_PATH: ffprobePath
  })

  setStatus('ffmpeg', true);  // Mark as completed
  logger.debug('FFmpeg setup completed.');
}
