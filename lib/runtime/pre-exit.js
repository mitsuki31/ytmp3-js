/**
 * @file A module that handles graceful shutdown procedures before Node.js exit.
 *
 * This module handles graceful shutdown procedures by invoking registered cleanup
 * hooks before the Node.js process exits. It is intended to be executed only from
 * the main module, and throws an error if required as a child module before setup.
 * 
 * The hooks are collected via {@link module:setup/pre-exit~getGlob getGlob('__onExit')}, and each function is invoked
 * in order — supporting both synchronous and asynchronous functions.
 * 
 * This is typically used in conjunction with {@link module:env~runBeforeExit} from the `env` module.
 * 
 * @throws {Error} If the module is run from the main entry point or the setup has not been initialized.
 *
 * @example
 * // Register a cleanup hook elsewhere
 * runBeforeExit(() => {
 *   // Clean up logic
 * });
 *
 * // Then trigger this before exiting
 * await require('./setup/pre-exit')();
 *
 * @module    runtime/pre-exit
 * @requires  env
 * @requires  {@link https://nodejs.org/api/util.html node:util}
 * @author    Ryuu Mitsuki <{@link https://github.com/mitsuki31}>
 * @license   MIT
 * @since     2.0.0
 */

'use strict';

const { types: { isAsyncFunction } } = require('node:util');
const { hasSetup, getGlob } = require('../env');

let called = false;

if (require.main === module && !hasSetup()) {
  throw new Error('This module is intended to run from main module');
}

async function cleanUp(exitCode) {
  if (called) return;
  called = true;
  const log = getGlob('logger');
  log?.debug('Calling clean up hooks before exiting …');

  const hooks = getGlob('__onExit', []);
  if (hooks.length === 0) {
    log?.debug('No cleanup hooks registered.');
    process.exitCode = exitCode ?? 0;
    return;
  }

  const tasks = hooks.map(hook => {
    const label = hook?.name || '(anonymous)';
    log?.debug(`=> [${isAsyncFunction(hook) ? 'Async' : ''}Function: ${label}]()`);

    try {
      const result = hook();
      return isAsyncFunction(hook)
        ? result
        : Promise.resolve(result);
    } catch (e) {
      return Promise.reject(e);
    }
  });

  let hasTimedOut = false;
  // Wait for all, but give up after 1000ms
  await Promise.race([
    Promise.allSettled(tasks),
    new Promise(r => setTimeout(() => { (hasTimedOut = true); r(); }, 1000))
  ]);

  log?.debug(`Cleanup hooks completed${hasTimedOut ? ' (timed out)' : ''}.`);
  process.exitCode = exitCode ?? 0;
}

module.exports = cleanUp;

