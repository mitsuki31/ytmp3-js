import type { Logger } from '#utils/log/index.js';
import { runSetup } from '#runtime/argparser.js';
import { getStatus, setStatus } from '../constants.js';

export default function init({ logger }: { logger?: Logger }) {
  if (getStatus('argparser')) return undefined;

  const result = runSetup({ logger });

  setStatus('argparser', true);
  logger?.debug('Argument parser setup completed.');

  return result;
}
