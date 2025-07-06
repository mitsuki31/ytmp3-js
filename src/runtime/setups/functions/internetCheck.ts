import { type Logger, NoneLogger, DefaultLogger } from '#/utils';
import { hasConnectivity } from '#/utils/connection';
import { logError } from '#/utils/diag';
import { getGlob, hasSetup, setGlob } from '#runtime/env';
import { getStatus, setStatus } from '../constants';

export default async function init({ logger, onlyDnsCheck = true }: { logger?: Logger, onlyDnsCheck?: boolean }) {
  // * Setup guard
  if (getStatus('connectivity')) return;

  if (!hasSetup()) {
    DefaultLogger.error('Internet check failed: Application has not been initialized yet.');
    return;
  }

  if (!logger) logger = getGlob('logger', NoneLogger) as Logger;
  logger.debug('Starting internet connectivity check...');

  let connected = false;
  try {
    connected = await hasConnectivity({ logger, onlyDnsCheck });
  } catch (err) {
    if (err instanceof Error) {
      logError('Internet connectivity check failed with error: %s', { ...err, message: err.message }, logger);
    }
    if (getGlob('interrupted')) return;
  }
  logger.debug(`Internet connectivity ${connected ? 'detected' : 'not detected'}.`);

  // Update the global state
  setGlob('hasConnectivity', connected);

  setStatus('connectivity', true);  // Mark as completed
  logger.debug('Internet check completed.');
}
