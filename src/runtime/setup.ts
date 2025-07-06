/**
 * Performs essential setup routines for command-line application usage.
 *
 * This module is responsible for:
 *
 * - Parsing and applying environment variables to configure runtime behavior.
 * - Parsing command-line arguments and options. 
 * - Validating and locating the `ffmpeg` and `ffprobe` binary on the system.
 * - Verifying internet connectivity using a DNS lookup.
 * - and more.
 *
 * These steps help ensure that the environment is correctly set up
 * before the rest of the application logic is executed.
 *
 * ### Environment Variables
 *
 * The following environment variables are recognized and used by the application:
 *
 * - `YTMP3__NO_COLOR` / [`NO_COLOR`](https://no-color.org/)  
 *   Disables colored output. If either is set, colored logs will be turned off.
 * 
 * - `YTMP3__LOG_LEVEL`  
 *   Controls the verbosity of logs. Expected values: `DEBUG`, `INFO`, `WARN`, `ERROR`, `NONE`.
 *
 * - `YTMP3__DEBUG` / `DEBUG`  
 *   Alias for `YTMP3__LOG_LEVEL=DEBUG`. If set, log level is forced to `DEBUG`.
 * 
 * - `YTMP3__LOG_FILE`  
 *   Path to a file where logs should be written, instead of or in addition to stdout.
 *
 * - `FFMPEG_PATH`  
 *   Explicitly specify the path to the `ffmpeg` binary file. If unset, manual detection will be used.
 *
 * @module    runtime/setup
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 * @see       {@link https://no-color.org/ | `NO_COLOR` standard}
 */

import util from 'node:util';

import type { SetupPartialConfig } from '#/types/config';
import type { NoParamAsyncFunction, NoParamFunction } from '#/types/utils';
import { TerminalFormatter } from '#/utils';
import { LoggerConstructor, NoneLogger, type Logger } from '#utils/log';
import { setGlob, getGlob, setInterrupted, hasInterrupted } from '#runtime/env';
import { style as $c } from '#colors';
import { YTMP3_SYMBOL, YTMP3GlobalState, type Global as YTMP3Global } from '#globals';
import { getStatus, MAX_LINE_LENGTH } from './setups/constants';
import {
  setupLog,
  setupGlobalEnv,
  setupInternetCheck,
  setupFfmpeg,
  setupMetadata,
  setupInnertubeSession,
  setupConfig,
  setupArgparser,
} from './setups';
import cleanup, { attachToTerminationSignals } from './pre-exit';

// Safely create a prototype of YTMP3-JS global state using `Object.assign`
Object.assign(global, { [YTMP3_SYMBOL]: {} });

let setupTime: number | undefined;  // Initialized whenever the `setupPartial` or `setupAll` called

interface SetupItem {
  name?: keyof SetupPartialConfig;  // Typically set by `consumeSetups`
  /** The priority of the setup. The higher the priority, the earlier the setup is executed. */
  priority: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (options: { logger?: Logger, [key: string]: any }) => any | Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args?: Record<string, any>;
  after?: NoParamFunction<void> | NoParamAsyncFunction<void>;
}
const setups: Record<keyof SetupPartialConfig, SetupItem> = {
  'setup.metadata':         { priority: 90, fn: setupMetadata },
  'setup.log':              { priority: 100, fn: setupLog, after: setupLog.after },
  'setup.ffmpeg':           { priority: 40, fn: setupFfmpeg },
  'setup.config':           { priority: 70, fn: setupConfig },
  'setup.globalEnv':        { priority: 60, fn: setupGlobalEnv },
  'setup.argparser':        { priority: 50, fn: setupArgparser },
  'setup.connectivity':     { priority: 10, fn: setupInternetCheck },
  'setup.innertubeSession': { priority: 10, fn: setupInnertubeSession },
};

const defaultSetups: Record<keyof SetupPartialConfig, boolean> = {
  'setup.metadata': true,
  'setup.log': true,
  'setup.ffmpeg': false,
  'setup.globalEnv': true,
  'setup.connectivity': false,
  'setup.config': true,
  'setup.argparser': true,
  'setup.innertubeSession': true,
};

/**
 * Consumes and runs the setup functions.
 *
 * @param setups - The object containing setup functions.
 * @param enabled - The object containing a boolean value for each setup function.
 *                  If the value is `true`, the setup function is executed.
 * @param logger - The logger instance for logging messages.
 * @param dryRun - If `true`, the setup functions are not executed.
 *                 This is useful for checking if the setup functions are correctly
 *                 configured without actually running them.
 *
 * @returns An object containing the return value of each setup function.
 *          The keys of the object are the names of the setup functions, and the values
 *          are the return values of the setup functions.
 *
 * @internal
 * @since    5.0.0
 */
async function consumeSetups(
  setups: Record<keyof SetupPartialConfig, SetupItem>,
  enabled: SetupPartialConfig,
  logger: Logger,
  dryRun?: boolean,
) {
  if (dryRun && logger.levelStr === 'DEBUG') {
    const msg = 'Running in dry-run mode';
    logger.debug(msg);
    logger.line(msg.length, logger.DEBUG_PREFIX);
  }

  const setupArrays = Object.entries(setups).map(([name, item]) => {
    if (enabled[name as keyof SetupPartialConfig]) {
      item.name = name as keyof SetupPartialConfig;
      return item;
    }
    return null;
  }).filter(Boolean) as SetupItem[];
  const returnValues = Object.entries(setups).reduce((acc, [name]) => {
    acc[name as keyof SetupPartialConfig] = undefined;
    return acc;
  }, {} as { [K in keyof typeof setups]: ReturnType<typeof setups[K]["fn"]> | undefined });

  for (const setup of setupArrays) {
    // Always check for updates to the logger
    const newLogger = getGlob('logger') as Logger | undefined;
    if (newLogger && newLogger.levelStr !== logger.levelStr) {  // Only update if the level has changed
      logger = newLogger;
    }

    const setupName = setup.name ?? '(anonymous)';
    // Check if the setup has been called before
    if (getStatus(setup.name?.replace('setup.', '') as keyof YTMP3GlobalState["__setup"])) {
      logger.debug(`Skipping setup: "${setupName}"`);
      continue;
    }

    logger.debug(`Running setup: "${setupName}"`);
    const res = !dryRun ? setup.fn({ logger, ...(setup.args ?? {}) }) : null;
    returnValues[setup.name as keyof SetupPartialConfig] = (res instanceof Promise) ? await res : res;

    // Stop when interruption has occurred
    if (hasInterrupted()) {
      logger.error('Setup interrupted.');
      logger.error('Exiting application...');
      await cleanup(Number(process.exitCode ?? 130), true);
    }

    // Check if the setup has `after` to be called after setup
    if (setup.after) {
      const resAfter = !dryRun ? setup.after() : null;
      if (resAfter instanceof Promise) void await resAfter;  // Await the promise
    }
    logger.debug(`Setup "${setupName}" completed.`);
    if (logger.levelStr === 'DEBUG') logger.line(MAX_LINE_LENGTH, logger.DEBUG_PREFIX);
  }

  return returnValues;
}


/**
 * Partially setup the application.
 *
 * There are multiple steps in the setup process, and this function allows us to
 * control which steps want to be executed. Here's the list of steps:
 * 
 * - `setup.metadata` - Retrieve project metadata. Defaults to `true`.
 * - `setup.log` - Setup logging. Defaults to `true`.
 * - `setup.ffmpeg` - Find and validate `ffmpeg` and `ffprobe` binaries. Defaults to `false`.
 * - `setup.globalEnv` - Setup global environment variables. Defaults to `true`.
 * - `setup.connectivity` - Check internet connectivity. Defaults to `false`.
 *
 * @remarks
 * The setup connectivity can be slow, particularly if the `onlyDnsCheck` option is set to `false`.
 * The `utils/index` module's internet checking via TCP and HTTP is slow to terminate the event loop,
 * although smoothly handling interruptions alongside with 'process.exit' call.
 *
 * In order to bypass this, specify the default value of `onlyDnsCheck` to 'true', which forces
 * the setup connectivity to only do DNS checks.
 *
 * @internal
 * @since 5.0.0
 */
export async function setupPartial(config?: SetupPartialConfig, dryRun?: boolean) {
  // Begin setup
  setupTime = Date.now();

  process.once('SIGINT', () => {
    if (process.stdout.isTTY && !process.stdout.isPaused) {
      TerminalFormatter.clearLine(process.stdout);
    }
    setInterrupted();
  });

  attachToTerminationSignals();  // Attach to termination signals

  config = { ...defaultSetups, ...config };

  let logger = getGlob('logger') as Logger | undefined;

  // Setup logger if the logger is not provided or is not an instance of Logger
  if (!logger && config['setup.log']) {
    setupLog();
    // Reset and get the logger from global
    logger = getGlob('logger') as Logger;
  }
  config['setup.log'] = !(logger instanceof LoggerConstructor);  // Disable if logger has been setup

  // Sort the setups by its priority
  const sortedSetups = Object.entries(setups)
    .sort((a, b) => b[1].priority - a[1].priority)
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {} as typeof setups);

  logger?.debug('Running application setup...');
  const setupResults = await consumeSetups(sortedSetups, config, logger ?? NoneLogger, dryRun);
  if (dryRun) return;  // Return from here if dry run

  // Indicates that the setup has done
  setGlob('ready', true);

  const totalTime = Date.now() - setupTime;
  const colorForTime = config['setup.innertubeSession']
    ? ((totalTime > 10e3 && totalTime < 10e2 * 15) ? 'Y' : (totalTime >= 10e2 * 15 ? 'R' : 'G'))
    : ((totalTime > 3000 && totalTime < 5000) ? 'Y' : (totalTime >= 5000 ? 'R' : 'G'));
  if (getGlob('logLevel') === 'DEBUG') {
    // Filter out project metadata
    const globalState = (global as YTMP3Global)[YTMP3_SYMBOL];
    delete globalState?.$__metadata__$;

    // Inspect and log the configured global state
    logger?.debug($c('BM', 'Configured global state:'), util.inspect(globalState, {
      colors: true, compact: false, showHidden: true, depth: null
    }));
    logger?.done(`Setup completed in ${$c(colorForTime, totalTime + 'ms')} (${(totalTime / 1000).toFixed(2)}s).`);
  }

  return setupResults;
}


/**
 * Fully setup the application.
 * @internal
 * @since 5.0.0
 */
export async function setupAll({ dryRun }: { dryRun?: boolean } = {}) {
  // Dynamically set all setups to true
  return await setupPartial(Object.entries(setups).reduce((acc, [name]) => {
    acc[name as keyof SetupPartialConfig] = true;
    return acc;
  }, {} as { [K in keyof SetupPartialConfig]-?: true }), dryRun);
}
