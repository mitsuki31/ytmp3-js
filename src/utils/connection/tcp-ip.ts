/**
 * @module    utils/connection/tcp-ip
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import net from 'node:net';
import http from 'node:http';

import { style as $c } from '#colors';
import { getGlob, setInterrupted } from '#runtime/env';
import type { Logger } from '#utils/log';

/**
 * Converts an IP address in string format to a numerical representation.
 *
 * @param ip - The IP address in string format (e.g., `"192.168.1.1"`)
 * @returns The numerical representation of the IP address
 *
 * @example
 * ```js
 * console.log(ipToNumber('192.168.1.1'));  // -1062731519
 * console.log(ipToNumber('127.0.0.1'));    // 2130706433
 * ```
 *
 * @internal
 * @since 5.0.0
 */
export function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
}

/**
 * Checks if the internet is available by sending a HEAD request to a specified URL.
 *
 * This function sends a HEAD request to the specified URL and checks the response status code.
 * If the status code is between `200` and `400`, it returns `true`, indicating that the internet is available.
 * If the status code is outside this range, or if an error occurs during the request, it returns `false`.
 *
 * The function also supports aborting the request if a `SIGINT` signal is received, and it logs debug messages
 * to indicate the progress of the request.
 *
 * @param options - Options for the internet check.
 * @param options.url - The URL to send the HEAD request to.
 * @param options.timeout - The timeout for the HEAD request in milliseconds.
 * @param options.logger - The logger to use for logging.
 *
 * @returns A promise that resolves to `true` if the internet is available, `false` otherwise
 *
 * @internal
 * @since 5.0.0
 */
export async function checkInternetViaHEAD({ url = 'http://www.gstatic.com/generate_204', timeout = 3500, logger }: {
  url?: string,
  timeout?: number,
  logger: Logger
}): Promise<boolean> {
  // Check if interrupted
  if (getGlob('interrupted')) return false;

  type InterruptedError = Error & { timeout?: number, url?: string, aborted?:boolean };

  const abortController = new AbortController();
  const abortFunc = () => {
    if (process.stdout.isTTY) {
      process.stdout.clearLine(-1);
      process.stdout.cursorTo(0);
    }
    logger.debug('SIGINT received, aborting HTTP request...');
    setInterrupted();
    abortController.abort();
  };

  // Ensure the SIGINT listener is always removed when the promise settles
  const cleanup = () => process.off('SIGINT', abortFunc);

  process.once('SIGINT', abortFunc);
  logger.debug(`Sending HEAD request to ${$c([0, 'C'], url)} ...`);

  return new Promise<boolean>((resolve, reject) => {
    const req = http.request(url, { method: 'HEAD', signal: abortController.signal, agent: false }, res => {
      cleanup(); // Remove SIGINT listener as request completed
      const success = (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 400;
      logger.debug(`HEAD request to ${url} finished with status ${res.statusCode}. Success: ${success}`);
      resolve(success);
    });

    req.on('error', (err) => {
      cleanup(); // Remove SIGINT listener on error
      // Handle AbortError specifically
      if (err.name === 'AbortError') {
        logger.debug(`HTTP request aborted for ${url}.`);
        const abortError: InterruptedError = new Error(`Internet check was aborted for ${url}.`);
        abortError.url = url;
        abortError.aborted = true;
        reject(abortError);
      } else {
        logger.error(`Error during HEAD request to ${url}: ${err.message}`);
        const requestError: Error & { timeout?: number, url?: string } = new Error(`Error checking internet via ${url}: ${err.message}`);
        requestError.url = url;
        reject(requestError);
      }
    });

    req.setTimeout(timeout, () => {
      cleanup();  // Remove SIGINT listener on timeout
      const timeoutError: Error & { timeout?: number, url?: string } = new Error(
        `Internet check has timed out after ${timeout} ms for ${url}`);
      timeoutError.timeout = timeout;
      timeoutError.url = url;
      req.destroy(timeoutError);  // Destroy the request immediately
      reject(timeoutError);
    });

    req.end();
  }).finally(() => {
    // This finally block ensures cleanup is called even if resolution/rejection paths are missed
    // However, it's better to call cleanup directly in resolve/reject/error/timeout for immediate effect.
    // Keeping it here as a safety net, but direct calls are preferred.
    cleanup();
  });
}

/**
 * Checks if the internet connection is available via TCP by attempting to connect to a specified URL.
 *
 * This function creates a TCP socket and attempts to connect to the specified URL. If the connection is successful,
 * it immediately closes the socket and resolves the promise with `true`. If the connection fails or times out,
 * it resolves the promise with `false`.
 *
 * @param options - Options for the TCP check.
 * @param options.url - The URL to check for internet connection.
 * @param options.timeout - The timeout in milliseconds for the TCP connection.
 * @param options.logger - The logger instance for logging debug and error messages.
 *
 * @returns A promise that resolves to `true` if the internet connection is available, `false` otherwise.
 *
 * @internal
 * @since 5.0.0
 */
export async function checkInternetViaTCP({
  url = 'http://www.gstatic.com/generate_204',
  timeout = 3500,
  logger
}: {
  url?: string,
  timeout?: number,
  logger: Logger
}): Promise<boolean> {
  // Check if interrupted globally before starting
  if (getGlob('interrupted')) {
    logger.debug('Global interrupted flag detected, aborting TCP check.');
    return false;
  }

  let host: string;
  let port: number;
  try {
    const urlObj = new URL(url);
    host = urlObj.hostname;
    port = urlObj.protocol === 'https:' ? 443 : 80;
  } catch (e) {
    if (e instanceof Error) {
      logger.error(`Invalid URL for TCP check: ${url}. Error: ${e.message}`);
    }
    return false;
  }

  logger.debug(`Attempting TCP connection to ${host}:${port} with timeout ${timeout}ms...`);

  let hasResolved = false;
  return await new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    let connected = false;
    const onClose = () => {
      if (!connected) {
        // If closed without connecting, it means failure
        logger.debug(`TCP connection to ${host}:${port} closed before connection was established.`);
        resolve(false); // Resolve false if not already resolved by 'connect'
      }
    }

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      logger.debug(`TCP connection to ${host}:${port} successful.`);
      connected = true;
      socket.off('close', onClose);
      socket.destroy(); // Close the socket immediately
      hasResolved = true;
      resolve(true);
    });

    socket.on('timeout', () => {
      logger.debug(`TCP connection to ${host}:${port} timed out.`);
      socket.off('close', onClose);
      socket.destroy();
      hasResolved = true;
      resolve(false);
    });
    
    socket.on('error', (err: NodeJS.ErrnoException) => {
      // ETIMEDOUT (connection timeout), ECONNREFUSED, ENOTFOUND (DNS failure)
      logger.debug(`TCP connection error to ${host}:${port}: ${err.message} (Code: ${err.code})`);
      if (!socket.destroyed) socket.destroy();
      if (hasResolved) return;
      socket.off('close', onClose);
      resolve(false);
    });

    socket.on('close', onClose);
    socket.connect(port, host);
  });
}
