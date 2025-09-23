/**
 * @module    utils/connection/dns
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import dns from 'node:dns';
import { inspect } from 'node:util';
import type { WriteStream as TTYWriteStream } from 'node:tty';

import { getGlob, setInterrupted } from '#runtime/env';
import { customDateFormat, type Logger } from '#utils/log';
import { DNSLookupTimeoutError } from '#error';
import { style } from '#/vendor/colors';
import { ipToNumber } from './tcp-ip';

/**
 * Performs a DNS lookup for a given hostname with a specified timeout.
 *
 * @param hostname - The hostname to lookup.
 * @param timeout - The timeout in milliseconds (default: 5000ms).
 * @returns A Promise that resolves to an array of DNS lookup addresses,
 *          or rejects with an error if the lookup times out or fails.
 *
 * @internal
 * @since 5.0.0
 */
export async function dnsLookup(hostname: string, timeout = 5000): Promise<dns.LookupAddress[] | null> {
  const logger: Logger | undefined = getGlob('logger');
  logger?.debug(`Starting DNS lookup for ${hostname} with timeout ${timeout}ms...`);

  // Check if interrupted globally before starting
  if (getGlob('interrupted')) {
    logger?.debug('Global interrupted flag detected, aborting DNS lookup.');
    return null;
  }

  const error: Error & { timeout?: number, hostname?: string } = new Error(
    `DNS lookup timed out after ${timeout} ms for ${hostname}`);
  error.timeout = timeout;
  error.hostname = hostname;

  return await new Promise<dns.LookupAddress[] | null>((resolve, reject) => {
    const resolver = new dns.Resolver();
    let timeoutId: NodeJS.Timeout | null = null;
    let sigintListener: (() => void) | null = null;
    let hasCleanup = false;

    // Define cleanup function for this specific lookup attempt
    const cleanup = () => {
      if (hasCleanup) return;
      hasCleanup = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (sigintListener) {
        process.off('SIGINT', sigintListener);
      }
      logger?.debug(`DNS lookup cleanup completed for ${hostname}.`);
    };

    // --- SIGINT Handling ---
    sigintListener = () => {
      logger?.debug(`SIGINT received during DNS lookup for ${hostname}, cancelling.`);
      if (process.stdout.isTTY && process.stdout.clearLine) {
        process.stdout.clearLine(-1);
        process.stdout.cursorTo(0);
      }
      setInterrupted();   // Set global flag
      cleanup();          // Clean up timeout and SIGINT listener
      resolver.cancel();  // Cancel the ongoing DNS lookup
      reject(new Error('SIGINT received, DNS lookup aborted.'));
    };
    process.once('SIGINT', sigintListener);

    // --- Timeout Handling ---
    timeoutId = setTimeout(() => {
      logger?.debug(`DNS lookup timed out after ${timeout}ms, cancelling ...`);
      cleanup();  // Clean up SIGINT listener and timeout
      resolver.cancel();
      const timeoutError = new DNSLookupTimeoutError(`DNS lookup timed out after ${timeout} ms for ${hostname}`, {
        timeout,
        hostname
      });
      reject(timeoutError);
    }, timeout);

    // --- Perform the DNS Lookup ---
    resolver.resolve(hostname, 'A', (err, addresses) => { // Using 'A' for IPv4 addresses
      cleanup();  // Clean up timeout and SIGINT listener when lookup completes/errors

      if (err) {
        if (err.code === 'ECANCELLED') {  // Check for cancellation error
          if (hasCleanup) return;  // Already cleaned up
          logger?.debug(`DNS lookup for ${hostname} was cancelled.`);
          return;
        }

        logger?.error(`DNS lookup failed for ${hostname}: ${err.message} (Code: ${err.code || 'N/A'})`);
        if (err.code === 'ENOTFOUND') {
          resolve(null);  // Return null for 'host not found'
        } else {
          reject(err);    // Re-throw other DNS errors
        }
      } else {
        logger?.debug(`DNS lookup for ${hostname} successful`);
        resolve(addresses.map(addr => ({ address: addr, family: 4 })));  // Map to LookupAddress[] format
      }
    });
  });
}

/**
 * Waits for internet connectivity by performing repeated DNS lookups.
 *
 * @param options - Options for the connectivity check.
 * @param options.hostname - The hostname to perform DNS lookups on.
 * @param options.timeout - The total timeout in milliseconds for the connectivity check.
 * @param options.interval - The interval in milliseconds between DNS lookups.
 * @param options.logger - The logger instance for logging debug and error messages. If not provided, no logging will occur.
 *
 * @returns A promise that resolves to `true` if internet connectivity is detected, `false` otherwise.
 *
 * @internal
 * @since 5.0.0
 */
export async function waitForConnectivity({
  hostname = 'www.youtube.com',
  timeout = 10e2 * 4 * 3,
  interval = 3000,
  logger = undefined
}: {
  hostname?: string;
  timeout?: number;
  interval?: number;
  logger?: Logger;
} = {}): Promise<boolean> {
  const start = Date.now();  // Record the start time

  let hasRetry = false;
  let ok = false;
  while (Date.now() - start < timeout) {
    try {
      const addresses = await dnsLookup(hostname, 4000);
      addresses?.sort((a, b) => ipToNumber(a.address) - ipToNumber(b.address));
      logger?.debug(`Hostname ${style('C', hostname)} resolved to:`, inspect(addresses, { colors: true, depth: 1 }));
      ok = !!addresses?.length;
      if (ok) break;  // Break the loop if has connectivity
    } catch (err) {
      if (err instanceof Error) {
        if (err instanceof DNSLookupTimeoutError) {
          if (logger) {
            const prefix = cusStreateFormat(new Date(), true) + style('~', '::') + logger.WARNING_PREFIX;
            logger.write('No internet connection. Retrying...', prefix, logger.stderr);
          }
          // Wait for the specified interval before retrying
          await new Promise(r => setTimeout(r, interval));
          if (logger) {
            if (!logger.stderr.isTTY) {
              logger.stderr.write('\n');  // Add newline if the target stream is not a TTY
            } else {
              (logger.stderr as TTYWriteStream).cursorTo(0);
            }
          }
          if (!hasRetry) hasRetry = true;
          continue;  // Retry
        }
        if (logger) logger.stderr.write('\n');  // Prevent overlap with error message
        // Otherwise, re-throw the error if is not a DNS lookup error (e.g., interrupted)
        throw err;
      }
    }
  }

  if (logger && hasRetry) logger.stderr.write('\n');  // Prevent overlap with error message
  return ok;
}
