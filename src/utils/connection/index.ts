import util from 'node:util';
import dns from 'node:dns';

import { style as $c } from '#colors';
import type { YTMP3GlobalState } from '#globals';
import { getGlob } from '#runtime/env.js';
import { logError } from '#utils/diag/index.js';
import { Logger, LogLevel } from '#utils/log/index.js';
import { dnsLookup } from './dns.js';
import { checkInternetViaTCP, ipToNumber } from './tcp-ip.js';

export * from './dns.js';
export * from './tcp-ip.js';

export async function hasConnectivity({ logger, onlyDnsCheck = true }: {
  logger: Logger,
  onlyDnsCheck?: boolean
}): Promise<boolean> {
  // Check if interrupted
  if (getGlob('interrupted')) return false;

  let result = false;
  let addresses: dns.LookupAddress[] = [];
  let currentDNS: string | string[] = dns.getServers();
  currentDNS = currentDNS.length === 1 ? currentDNS[0] : currentDNS;

  logger.debug(util.format('Current device DNS servers: %s',
    util.inspect(currentDNS, { compact: false, colors: true })
  ));

  let hasError = false;
  try {
    logger.debug(`Attempting DNS lookup to ${$c([0, 'C'], 'www.youtube.com')} ...`);
    addresses = await dnsLookup('www.youtube.com', 1500) as dns.LookupAddress[];

    addresses.sort((a, b) => ipToNumber(a.address) - ipToNumber(b.address));
    const addressesStr = util.inspect(addresses, { compact: true, colors: true });
    logger.debug(util.format(
      'DNS lookup succeed with result: %s',
      addressesStr.replace(/^\[\s/, '[\n  ').replace(/\s\]$/, '\n]')
    ));
    result = true;
  } catch (err) {
    if (err instanceof Error && logger.level === LogLevel.DEBUG) {  // ! WARN: These error messages will only appear on debug level
      hasError = true;
      logError('DNS lookup failed with error: %s', { ...err, message: err.message }, logger);

      if ([
        (getGlob('env') as YTMP3GlobalState['env'])?.HTTP_PROXY,
        (getGlob('env') as YTMP3GlobalState['env'])?.HTTPS_PROXY
      ].some(Boolean)) {
        logger.warn('Ouchh, looks like you are behind a proxy server');
      }
    }
  }

  // Check if interrupted globally before advance to the next check
  if (getGlob('interrupted')) {
    logger?.debug('Global interrupted flag detected, aborting internet check.');
    return false;
  }

  if (onlyDnsCheck) return result;

  if (hasError) {
    logger?.debug('DNS lookup failed, aborting internet check.');
    return false;
  }

  // !! BUG: Internet check either via TCP or HTTP will causing longer exit time !! //

  try {
    logger.debug('Checking internet connectivity via TCP ...');
    result = await checkInternetViaTCP({ logger });
  } catch (err) {
    if (err instanceof Error && logger.level === LogLevel.DEBUG) {  // ! WARN: These error messages will only appear on debug level
      logError('Internet checking has failed with error: %s', { ...err, message: err.message }, logger);
      if (!(err as { aborted?: boolean }).aborted)
        logger.error($c([0, 'BR'], 'If you are behind proxy, please check your proxy configuration'));
    }
  }

  return result && !!addresses?.length;
}
