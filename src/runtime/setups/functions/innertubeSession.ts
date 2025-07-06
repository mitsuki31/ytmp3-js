import { Innertube, type SessionOptions } from 'youtubei.js';

import type { ResolvedYTMP3Config } from '#/types/config';
import { type Logger, NoneLogger, DefaultLogger } from '#/utils';
import { logError } from '#/utils/diag';
import { merge } from '#/utils/options';
import { getGlob, hasSetup, setGlob } from '#runtime/env';
import { getStatus, setStatus } from '../constants';

export default async function init({ logger, config }: { logger?: Logger, config?: SessionOptions }) {
  // * Setup guard
  if (getStatus('innertubeSession')) return;

  if (!hasSetup()) {
    DefaultLogger.error('Innertube session setup failed: Application has not been initialized yet.');
    return;
  }

  const globalConfig = getGlob('__parsedConfig', {}) as ResolvedYTMP3Config;
  const globalInnertubeConfig = getGlob('__globalInnertubeConfig', {}) as SessionOptions;
  const parsedInnertubeConfig = merge(globalInnertubeConfig, config ?? {});
  if (!logger) logger = getGlob('logger', NoneLogger) as Logger;

  if (!getStatus('connectivity')) {
    logger.debug('Internet connectivity not detected, creating session unconditionally...');
  }

  const cache = parsedInnertubeConfig.cache;
  let session: Innertube | undefined;
  try {
    logger.debug('Creating Innertube session...');
    session = await Innertube.create({
      ...parsedInnertubeConfig,
      // Do not use caching algorithm if `useCache` from global config set to `false`
      cache: globalConfig.downloadOptions.useCache === false ? undefined : cache
    });
  } catch (err) {
    if (err instanceof Error) {
      logError('Innertube session creation failed with error: %s', err, logger);
    }
    setStatus('innertubeSession', false);  // Just to ensure the status is marked as failed
    return;  // Abort
  }

  setGlob('innertube_session', session);
  setStatus('innertubeSession', true);  // Mark as completed
}
