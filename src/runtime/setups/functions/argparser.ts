import type { Logger } from '#utils/log';
import { runSetup } from '#runtime/argparser';
import { getStatus, setStatus } from '../constants';

export default function init({ logger }: { logger?: Logger }) {
  if (getStatus('argparser')) return undefined;

  const result = runSetup({ logger });

  setStatus('argparser', true);
  logger?.debug('Argument parser setup completed.');

  return result;
}
