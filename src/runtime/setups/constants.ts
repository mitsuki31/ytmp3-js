/**
 * Utilities for setup functions.
 *
 * @module    runtime/setups/constants
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import { YTMP3GlobalState } from '#globals';
import { getGlob } from '#runtime/env.js';

/** @private */
export const MAX_LINE_LENGTH = 40;  // The maximum length of a log line

/**
 * Retrieves the current status of a setup function.
 *
 * @param name - The name of the setup function to query its status.
 * @returns `true` if the setup function has been completed, `false` otherwise.
 *
 * @remarks
 * This function is used to check if a setup function has been completed.
 * It is useful for checking if certain setup functions have been completed
 * before running another setup function that relies on the previous ones.
 *
 * @internal
 * @since    5.0.0
 */
export function getStatus<T extends keyof NonNullable<YTMP3GlobalState["__setup"]>>(name: T): boolean {
  const allStatus = getGlob('__setup');
  if (!allStatus) return false;
  return allStatus[name];
}

/**
 * Sets the status of a setup function.
 *
 * @param name - The name of the setup function to set its status.
 * @param value - The value to set the status to. If `true`, the setup
 *                function is considered completed. Otherwise, the setup function is
 *                considered not completed.
 *
 * @returns `true` if the status was successfully set, `false` otherwise.
 *
 * @remarks
 * This function is used to set the status of a setup function. It is
 * useful for setting the status of a setup function after it has been
 * completed.
 *
 * @internal
 * @since    5.0.0
 */
export function setStatus<
  T extends keyof NonNullable<YTMP3GlobalState["__setup"]>
>(name: T, value: boolean): boolean {
  const allStatus = getGlob('__setup');
  if (!allStatus) return false;
  allStatus[name] = value;
  return true;
}
