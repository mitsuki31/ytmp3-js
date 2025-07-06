import path from 'node:path';

import { findGlobalConfig, parseGlobalConfig } from '#/core/config';
import type { ResolvedYTMP3Config, ResolvedYTMP3ConfigWithDev } from '#/types/config';
import { createLogger, DefaultLogger, type Logger, NoneLogger, YTMP3_HOMEDIR } from '#/utils';
import { defaults, merge } from '#utils/options';
import { getGlob, setGlob, hasSetup } from '#runtime/env';
import { setStatus, getStatus } from '../constants';

export default async function init({ logger }: { logger?: Logger }) {
  // * Setup guard
  if (getStatus('config')) return;

  if (!hasSetup()) {
    DefaultLogger.error('Config setup failed: Application has not been initialized yet.');
    return;
  }

  if (!logger) logger = getGlob('logger', NoneLogger);

  let resolvedConfig: ResolvedYTMP3ConfigWithDev = {
    downloadOptions: {},
    audioConverterOptions: {},
    innertubeConfig: {},
    developer_options: {},
  };

  // Get the global config
  logger.debug('Searching for global config...');
  const globalConfigFile = await findGlobalConfig(YTMP3_HOMEDIR);
  let globalConfig: ResolvedYTMP3Config | undefined;
  if (globalConfigFile) {
    logger.debug(`Using global config: ${path.basename(globalConfigFile)}`);
    globalConfig = await parseGlobalConfig(globalConfigFile) as ResolvedYTMP3ConfigWithDev;
  }

  // Merge with the default config
  resolvedConfig = mergeConfig(resolvedConfig, {
    downloadOptions: defaults.DownloadOptions,
    audioConverterOptions: defaults.AudioConverterOptions,
    innertubeConfig: defaults.InnerTubeConfig,
    developer_options: { debug: false }  // Developer options are not included in the default config
  });

  // Merge with the global config
  resolvedConfig = mergeConfig(resolvedConfig, (globalConfig || {}) as ResolvedYTMP3ConfigWithDev);

  // Create a new logger if the debug mode is enabled in developer options
  if (resolvedConfig.developer_options?.debug) {
    logger.debug('Debug mode is enabled in developer options, creating a new logger...');
    const newLogger = createLogger('DEBUG', { stdout: logger.stdout, stderr: logger.stderr });
    setGlob('logger', newLogger);
  }

  // Merge the global Innertube config with the Innertube config from parsed config
  const globalInnertubeConfig = getGlob('__globalInnertubeConfig', null);
  const resolvedInnertubeConfig = merge(resolvedConfig.innertubeConfig, globalInnertubeConfig ?? {}, false);

  // Set the parsed config
  setGlob('__parsedConfig', resolvedConfig);
  setGlob('__globalInnertubeConfig', resolvedInnertubeConfig);
  setStatus('config', true);  // Mark as completed
}

function mergeConfig(base: ResolvedYTMP3ConfigWithDev, config: ResolvedYTMP3ConfigWithDev): ResolvedYTMP3ConfigWithDev {
  const downloadOptions = merge(base.downloadOptions, config.downloadOptions, false);
  const audioConverterOptions = merge(base.audioConverterOptions, config.audioConverterOptions, false);
  const innertubeConfig = merge(base.innertubeConfig, config.innertubeConfig, false);
  const developer_options = merge(base.developer_options, config.developer_options, false);
  return { downloadOptions, audioConverterOptions, innertubeConfig, developer_options };
}
