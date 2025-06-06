/**
 * @file Internal environment setup module for **YTMP3-JS**.
 * 
 * Provides utility bindings for managing global configuration, detecting setup state,
 * and scheduling teardown behavior before process exit. This module is essential during
 * application bootstrap to ensure consistent access to shared symbols and lifecycle hooks.
 *
 * @module    env
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     2.0.0
 */

'use strict';

/**
 * A unique `Symbol` used to namespace all internal global state.
 * Ensures non-conflicting access to environment state across modules.
 * 
 * @type  {Symbol}
 * @since 2.0.0
 */
const YTMP3_SYMBOL = Symbol.for('ytmp3-js');

/**
 * Checks whether the program has run setup from {@link module:setup} module.
 *
 * The function will check the availability of `ytmp3-js` property in `global` context.
 *
 * @returns {boolean}
 *
 * @package
 * @since   2.0.0
 */
function hasSetup() {
  return global && typeof global[YTMP3_SYMBOL] === 'object';
}

/**
 * Retrieves the YTMP3-JS global variable from `global` context with optional fallback value.
 *
 * @template T
 * @param {string} name - The YTMP3-JS global variable name.
 * @param {T} [fallback] - An optional fallback value, set to `undefined` if not specified.
 * @returns {any | T} The YTMP3-JS global variable value based on the given name,
 *                    or the fallback value if undefined.
 *
 * @package
 * @since   2.0.0
 */
function getGlob(name, fallback) {
  return hasSetup() ? (global[YTMP3_SYMBOL][name] ?? fallback) : fallback;
}

/**
 * Sets a global variable inside the YTMP3 symbol context,
 * but only after the setup phase has completed.
 *
 * @param {string} name - The property name to assign within the global symbol object.
 * @param {any} value - The value to assign to the property.
 *
 * @package
 * @since   2.0.0
 */
function setGlob(name, value) {
  hasSetup() && (global[YTMP3_SYMBOL][name] = value);
}

/**
 * Registers a function to be executed just before the Node.js process exits.
 * The functions will be collected and stored internally for controlled shutdown.
 *
 * @param {Function} func - The function to call before process exits. Can be synchronous or asynchronous.
 * 
 * @example
 * runBeforeExit(async () => {
 *   await new Promise(resolve => stream.close(resolve));
 * });
 *
 * @package
 * @since   2.0.0
 */
function runBeforeExit(func) {
  setGlob('__onExit', [ ...getGlob('__onExit', []), func ]);
}


module.exports = {
  YTMP3_SYMBOL,
  hasSetup,
  getGlob,
  setGlob,
  runBeforeExit,
};

