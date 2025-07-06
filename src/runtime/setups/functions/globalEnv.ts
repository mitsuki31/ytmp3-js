import type { SessionOptions } from 'youtubei.js';

import { type YTMP3GlobalState, YTMP3_SYMBOL, type Global as YTMP3Global, type ProjectMetadata } from '#globals';
import { type Logger, DefaultLogger, NoneLogger } from '#/utils';
import { useNoColor, getGlob, getSystemEnv, hasSetup } from '#/runtime/env';
import type { NoParamFunction, NoParamAsyncFunction } from '#/utils';
import type { ResolvedYTMP3Config } from '#/core/config';
import { defaults } from '#/utils/options';
import { getStatus, setStatus } from '../constants';

export default function init({ logger }: { logger?: Logger }) {
  if (getStatus('globalEnv')) return;

  const noColor = useNoColor();
  if (!logger) logger = getGlob('logger', NoneLogger) as Logger;

  if (!hasSetup()) {
    DefaultLogger.error('Global env setup failed: Application has not been initialized yet.');
    return;
  }

  const getProxyOf = (key: 'http' | 'https' | 'socks') => {
    const envName = `${key}_proxy`;
    return [
      getSystemEnv(envName),
      getSystemEnv(envName.toUpperCase()),
    ].find(Boolean) /* fallback */ || getSystemEnv('NODE_HTTP_PROXY');
  };

  const ytmp3GlobalState: YTMP3GlobalState = {
    ...(globalThis as YTMP3Global)[YTMP3_SYMBOL],
    noColor,
    interrupted: false,
    env: {
      YTMP3__DEBUG: Boolean(getSystemEnv('YTMP3__DEBUG')),
      YTMP3__NO_COLOR: noColor,
      YTMP3__LOG_FILE: getGlob('logFile', undefined),
      YTMP3__LOG_LEVEL: getGlob('logLevel', 'INFO'),

      FFMPEG_PATH: getSystemEnv('FFMPEG_PATH'),
      FFPROBE_PATH: getSystemEnv('FFPROBE_PATH'),

      NODE_ENV: getSystemEnv('NODE_ENV'),
      NODE_OPTIONS: getSystemEnv('NODE_OPTIONS'),
      NO_COLOR: noColor,
      HTTP_PROXY: getProxyOf('http'),
      HTTPS_PROXY: getProxyOf('https'),
      SOCKS_PROXY: getProxyOf('socks'),
      NO_PROXY: [getSystemEnv('NO_PROXY'), getSystemEnv('no_proxy')].find(Boolean)
    },
    __globalInnertubeConfig: [
      (getGlob('__parsedConfig') as ResolvedYTMP3Config)?.innertubeConfig as SessionOptions,
      defaults.InnerTubeConfig
    ].find(Boolean),
  }

  // Reassign global
  Object.assign(global, { [YTMP3_SYMBOL]: ytmp3GlobalState });

  const notEnumerableGlobals = [
    ['__parsedConfig', getGlob('__parsedConfig', {} as ResolvedYTMP3Config)],
    ['__globalInnertubeConfig', getGlob('__globalInnertubeConfig', {} as SessionOptions)],
    ['__onExit', getGlob('__onExit', [] as (NoParamFunction<void> | NoParamAsyncFunction<void>)[])],
    ['$__metadata__$', getGlob('$__metadata__$', {} as Readonly<ProjectMetadata>)],
  ] as const;

  notEnumerableGlobals.forEach(map => {
    Object.defineProperty((global as YTMP3Global)[YTMP3_SYMBOL], map[0], {
      writable: true,
      configurable: true,
      enumerable: false,
      value: map[1]
    });
  });

  setStatus('globalEnv', true);
  logger.debug('Global environment setup completed.');
}
