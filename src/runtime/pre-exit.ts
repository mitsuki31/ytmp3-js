/**
 * A module that handles graceful shutdown procedures before Node.js exit.
 *
 * This module handles graceful shutdown procedures by invoking registered cleanup
 * hooks before the Node.js process exits. It is intended to be used only from
 * the main module, and throws an error if executed as a standalone module.
 * 
 * The hooks are collected via {@linkcode getGlob('__onExit')}, and each function is invoked
 * in order — supporting both synchronous and asynchronous functions.
 * 
 * This is typically used in conjunction with `runBeforeExit` from the `runtime/env` module.
 *
 * @module    runtime/pre-exit
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import { types } from 'node:util';
import { getGlob } from '#runtime/env';
import { logError, DefaultLogger } from '#/utils';
import type { NoParamAsyncFunction, NoParamFunction } from '#/utils';

let called = false;
let attached = false;

if (require.main === module) {
  throw new Error('This module is intended not to being run as main module');
}

/**
 * Invokes registered cleanup hooks before the Node.js process exits.
 *
 * @remarks
 * **DO NOT ATTACH THIS FUNCTION TO `exit` EVENT IN `process`.**  
 * This function should be called before the Node.js process exits to ensure
 * that the cleanup hooks are executed before the process exits.
 *
 * @param exitCode - The exit code to be set for the Node.js process.
 * @param forceExit - If set to `true`, forcing the process to exit immediately after
 *                    all hooks consumed or timed out after 5 seconds (hardcoded).
 * @returns A Promise that resolves when the cleanup hooks are complete.
 *
 * @example
 * ```js
 * // Register a cleanup hook elsewhere
 * runBeforeExit(() => {
 *   // Clean up logic
 * });
 *
 * // Then trigger this before exiting
 * await cleanup();
 * // Now the `process.exit` can be safely called
 * ```
 *
 * @internal
 * @since    5.0.0
 */
export default async function cleanup(exitCode: number, forceExit?: boolean): Promise<void>;
export default async function cleanup(exitCode: number, forceExit: true): Promise<never>;
export default async function cleanup(exitCode: number, forceExit?: boolean): Promise<void> {
  // Prevent this function from being called multiple times
  if (called) return;
  called = true;

  const log = getGlob('logger');
  log?.debug('Calling clean up hooks before exiting...');

  const hooks = getGlob('__onExit', []) as (NoParamFunction<void> | NoParamAsyncFunction<void>)[];
  if (hooks.length === 0) {
    log?.debug('No cleanup hooks registered.');
    process.exitCode = exitCode ?? process.exitCode;
    return;
  }

  const tasks = hooks.map(hook => {
    const label = hook.name || '(anonymous)';
    log?.debug(`=> [${types.isAsyncFunction(hook) ? 'Async' : ''}Function: ${label}]()`);

    try {
      const result = hook();
      return result instanceof Promise
        ? result
        : Promise.resolve(result);
    } catch (e) {
      logError('Error in cleanup hook %s', e as Error, DefaultLogger);
    }
  });

  let hasTimedOut = false;
  // Wait for all, but give up after 5000ms
  await Promise.race([
    Promise.allSettled(tasks),
    new Promise<void>(r => setTimeout(() => { (hasTimedOut = true); r(); }, 5000))
  ]);

  log?.debug(`Cleanup hooks completed${hasTimedOut ? ' (timed out)' : ''}.`);
  process.exitCode = Number(exitCode ?? process.exitCode);
  if (forceExit) process.exit();
}

/**
 * Attach hooks to Node.js termination signals (`SIGINT`, `SIGTERM`) that
 * call the {@link cleanup} function with the respective exit codes before exiting.
 *
 * @remarks
 * This function is intended to be called early in the application lifecycle to
 * ensure proper cleanup when the process is terminated.
 *
 * @internal
 * @since    5.0.0
 */
export function attachToTerminationSignals(): void {
  // Do nothing if already attached
  if (attached) return;
  attached = true;

  process.once('SIGINT', async () => await cleanup(130));
  process.once('SIGTERM', async () => await cleanup(143));
}
