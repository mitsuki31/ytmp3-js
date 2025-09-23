import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';

import type { YTMP3Env } from '#globals';
import { type Logger, LogLevel, isDefined, createLogger, DefaultLogger, isStreamClosed } from '#/utils/index.js';
import { logError } from '#/utils/diag/index.js';
import { getSystemEnv, setGlob, runBeforeExit, hasSetup, getGlob, isDebugMode } from '#runtime/env.js';
import { getStatus, setStatus } from '../constants.js';

export default function init() {
  // * Setup guard
  if (getStatus('log')) return;

  if (!hasSetup()) {
    DefaultLogger.error('Log setup failed: Application has not been initialized yet.');
    return;
  }

  let usedLogger: Logger | undefined = undefined;
  let hasError = false;
  const DEBUG = isDebugMode() ? 'DEBUG' : undefined;
  const LOG_LEVEL_ENV = (getSystemEnv('YTMP3__LOG_LEVEL') || 'INFO') as keyof typeof LogLevel;
  const LOG_LEVEL: keyof typeof LogLevel = (isDefined(DEBUG) ? DEBUG : undefined) || LOG_LEVEL_ENV;
  let LOG_FILE = getSystemEnv('YTMP3__LOG_FILE');

  const logStreamErrorHandler = function (err: Error) {
    // Restore the `logger` in global state to standard stream
    setGlob('logger', isDefined(LOG_LEVEL)
      ? createLogger(LOG_LEVEL, { stdout: process.stdout, stderr: process.stderr })
      : DefaultLogger
    );
    setGlob('logFile', undefined);  // Reset log file
    DefaultLogger.error(
      'Cannot use specified log file due to an error. Fallback to standard streams');
    logError(null, err, DefaultLogger);
  }
  const logStreamCloseHandler = async function (stream: fs.WriteStream) {
    if (!isStreamClosed(stream)) {
      void await new Promise<void>((resolve) => {
        stream.close((err) => {
          if (err) logError(null, err, DefaultLogger);
          resolve();
        });
      });
    }
  }

  if (isDefined(LOG_FILE)) {
    // Check if the directory of the log file exists
    try {
      // This could throws an error if the specified log file is within system directory
      // and causing 'EACCES' (Permission denied) error
      fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    } catch (err) {
      if (err instanceof Error) {
        hasError = true;
        LOG_FILE = undefined;  // Reset
        DefaultLogger.error(
          'Cannot use specified log file due to an error. Fallback to standard streams');
        logError(null, err, DefaultLogger);
      }
    }

    if (!hasError && isDefined(LOG_FILE)) {
      // Check if the log file already exists and should be appended
      const shouldAppend = fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > 0;
      const logFileStream = fs.createWriteStream(LOG_FILE, { flags: shouldAppend ? 'a+' : 'w' });
      logFileStream.once('error', logStreamErrorHandler);

      // Attach the close event handler to before exit hook
      runBeforeExit(async function closeYTMP3LogFile() {
        void await logStreamCloseHandler(logFileStream);
      });

      // Set the log file promise
      setGlob('logFile', new Promise<string>(resolve => {
        logFileStream.prependOnceListener('open', () => resolve(LOG_FILE as string));
      }));

      logFileStream.once('open', () => {
        let header = util.format('%s/[ YTMP3-JS LOGS ]\\%s\n',
          '='.repeat(50),
          '='.repeat(50)
        );

        // Create a new line for new logging outputs when appending log file
        if (shouldAppend) header = `\n\n${header}`;
        logFileStream.write(header);

        usedLogger = createLogger(LOG_LEVEL, {
          stdout: logFileStream,
          stderr: logFileStream
        });
      });
    }
  }

  if (!usedLogger) {
    usedLogger = createLogger(LOG_LEVEL, {
      stdout: process.stdout,
      stderr: process.stderr
    });
  }

  setGlob('logger', usedLogger);
  setGlob('logLevel', LOG_LEVEL);
  setStatus('log', true);  // Mark as completed
}

// Need to be called after the log file is created
init.after = async function after() {
  let logFile = getGlob('logFile') as string | Promise<string>;

  if (logFile && logFile instanceof Promise) {
    logFile = await logFile;
    setGlob('logFile', logFile);  // Wait for the log file to be created
    // Set the log file to the environment
    (getGlob('env') as Required<YTMP3Env>).YTMP3__LOG_FILE = logFile;
  }
}
