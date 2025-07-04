/**
 * Internal environment setup module for **YTMP3-JS**.
 * 
 * Provides utility bindings for managing global configuration and environment, detecting setup state,
 * and scheduling teardown behavior before process exit. This module is essential during
 * application bootstrap to ensure consistent access to shared symbols and lifecycle hooks.
 *
 * @module    runtime/env
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import { YTMP3_SYMBOL, type YTMP3GlobalState, type Global as AugmentedGlobal } from "#globals";
import type { NoParamFunction, NoParamAsyncFunction } from "#/types/utils";

/**
 * Checks whether the program has run setup.
 *
 * The function will check the availability of `ytmp3-js` property in `global` context.
 *
 * @returns `true` if the program has run setup, `false` otherwise.
 *
 * @internal
 * @since 5.0.0
 */
export function hasSetup(): boolean {
  const glob = global as AugmentedGlobal;
  return glob
    && {}.hasOwnProperty.call(glob, YTMP3_SYMBOL)
    && typeof glob[YTMP3_SYMBOL] === 'object';
}

/**
 * Checks if the global interruption flag is set.
 *
 * @returns `true` if the global interruption symbol exists and its `'interrupted'` property is `true`;
 *          otherwise, `false`.
 *
 * @internal
 * @since    5.0.0
 */
export function hasInterrupted(): boolean {
  return hasSetup() && getGlob('interrupted', false) as boolean;
}

/**
 * Sets the `'interrupted'` flag in the global `YTMP3_SYMBOL` object,
 * if the environment has been set up. This can be used to signal that
 * program has been interrupted.
 *
 * @param enabled - The value to set for the `'interrupted'` flag. If `undefined`, defaults to `true`.
 *
 * @internal
 * @since    5.0.0
 */
export function setInterrupted(enabled?: boolean): void {
  enabled = enabled === undefined ? true : false;  // Default to true if not provided
  if (hasSetup() && !hasInterrupted()) {
    (global as Required<AugmentedGlobal>)[YTMP3_SYMBOL]['interrupted'] = enabled;
    process.exitCode = enabled ? 128 + 2 : 0;  // SIGINT (enabled) or success (disabled)
  }
}

/**
 * Retrieves a specific property from the globally stored YTMP3 state,
 * but only after the setup phase has completed.
 *
 * @typeParam T - The key of the property to retrieve from the YTMP3 global state.
 * @typeParam U - The type of the fallback value.
 * @param name - The key of the property to retrieve (e.g., 'config', 'cache').
 * @param fallback - An optional fallback value to return if the global state is not set up
 *                         or if the specified property does not exist on the global state.
 * @returns The value of the requested property, or the fallback value.
 *
 * @internal
 * @since 5.0.0
 */
export function getGlob<T extends keyof YTMP3GlobalState, U = undefined>(name: T, fallback?: U): NonNullable<YTMP3GlobalState[T]> | U {
  return hasSetup()
    ? ((global as Required<AugmentedGlobal>)[YTMP3_SYMBOL][name] ?? fallback as U)
    : fallback as U;
}

/**
 * Sets a specific property to the globally stored YTMP3 state,
 * but only after the setup phase has completed.
 *
 * @param name - The property name to assign within the global symbol object.
 * @param value - The value to assign to the property.
 *
 * @internal
 * @since 5.0.0
 * @see {@link hasSetup()}
 */
export function setGlob<T extends keyof YTMP3GlobalState>(name: T, value: YTMP3GlobalState[T]): void {
  if (hasSetup()) (global as Required<AugmentedGlobal>)[YTMP3_SYMBOL][name] = value;
}

/**
 * Retrieves the value of a system environment variable.
 *
 * @param name - The name of the environment variable to retrieve.
 * @returns The value of the environment variable, or `undefined` if not set.
 *
 * @internal
 * @since 5.0.0
 * @see {@link getEnv}
 */
export function getSystemEnv(name: string): string | undefined {
  return process.env[name];
}

/**
 * Retrieves the value of a specific environment variable.
 *
 * @remarks
 * If the `options.env` parameter is not provided, it defaults to `process.env`.
 *
 * @param name - The name of the environment variable to retrieve.
 * @param options - An optional object containing a custom environment object.
 * @param options.env - The custom environment object to use. If left unspecified,
 *                      the default environment object (`process.env`) will be used.
 * @returns The value of the environment variable, or `undefined` if not set.
 *
 * @internal
 * @since 5.0.0
 * @see {@link getSystemEnv}
 */
export function getEnv(name: string, options = { env: process.env }): string | undefined {
  return options?.env[name];
}

/**
 * Checks whether the `NO_COLOR` or `YTMP3__NO_COLOR` environment variables are set.
 *
 * @returns `true` if the `NO_COLOR` or `YTMP3__NO_COLOR` environment variables are set, `false` otherwise.
 *
 * @internal
 * @since 5.0.0
 */
export function useNoColor(): boolean {
  return [getSystemEnv('NO_COLOR'), getSystemEnv('YTMP3__NO_COLOR')].some(isTruthy);
}

/**
 * Checks whether the program is running in debug mode.
 *
 * This function checks whether the `YTMP3__DEBUG` environment variable is set,
 * the `logLevel` property in the global state is set to `DEBUG`, or the `DEBUG` environment variable is set.
 *
 * @example
 * ```bash
 * env YTMP3__DEBUG=1 node index.js
 * ```
 *
 * ```js
 * console.log(isDebugMode());  // true
 * ```
 *
 * @returns `true` if the program is running in debug mode, `false` otherwise.
 *
 * @internal
 * @since 5.0.0
 */
export function isDebugMode(): boolean {
  return [
    getSystemEnv('YTMP3__DEBUG'),
    getGlob('logLevel') === 'DEBUG',
    getSystemEnv('DEBUG')
  ].some(isTruthy);
}

/**
 * Checks whether a given value is truthy.
 *
 * In this context, a value is considered truthy if it is not `false` or `0`.
 * It is typically used to determine the truthiness of a environment variable.
 *
 * @param value - The value to check.
 * @returns `true` if the value is truthy, `false` otherwise.
 *
 * @internal
 * @since 5.0.0
 */
export function isTruthy<T>(value: T): boolean {
  const TRUTHY = new Set(['true', '1', 'yes', 'y', 'on']);
  if (typeof value === 'string') return TRUTHY.has(value.toLowerCase());
  return Boolean(value);
}

/**
 * Checks whether a given value is falsy. The inverse of {@link isTruthy}.
 *
 * @param value - The value to check.
 * @returns `true` if the value is falsy, `false` otherwise.
 *
 * @internal
 * @since 5.0.0
 */
export function isFalsy<T>(value: T): boolean {
  return !isTruthy(value);
}

/**
 * Registers a function to be executed just before the Node.js process exits.
 * The functions will be collected and stored internally for controlled shutdown.
 *
 * @privateRemarks
 * It will stores the provided function to `__onExit` property in global YTMP3 state.
 * All functions within `__onExit` property should be consumed before Node.js process exits.
 *
 * @param func - The function to call before process exits. Can be synchronous or asynchronous.
 * 
 * @example
 * ```ts
 * runBeforeExit(async () => {
 *   await new Promise(resolve => stream.close(resolve));
 * });
 * ```
 *
 * @internal
 * @since 5.0.0
 */
export function runBeforeExit(func: NoParamFunction<void> | NoParamAsyncFunction<void>): void {
  const currentHooks = getGlob('__onExit', [] as (typeof func)[]);
  setGlob('__onExit', [ ...(currentHooks as NonNullable<typeof currentHooks>), func ]);
}
