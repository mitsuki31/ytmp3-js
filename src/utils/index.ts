/**
 * Main entry for `utils` module of **YTMP3-JS** project.
 *
 * This module provides a set of submodules for working with various utilities.
 *
 * @module    utils
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     1.0.0
 */

import fs, { type PathLike } from 'node:fs';

export * from './constants';
export * from '#colors';
export * from '#utils/log';
export * from '#utils/url-utils';
export * from '#utils/terminal';
export * from '#utils/stream';
export * from '#/vendor/type-utils';
export * from '#utils/connection';
export * from '#utils/diag';
export * from '#utils/mimetype';

// #region Utilities Function

/**
 * Synchronously checks whether the specified directory path is exist,
 * creates new if not exist with asynchronous operation.
 *
 * @param dirpath - The directory path to be created if not exist.
 *
 * @internal
 * @since  1.0.0
 */
export async function createDirIfNotExist(dirpath: PathLike): Promise<void> {
  if (!fs.existsSync(dirpath)) await fs.promises.mkdir(dirpath, { recursive: true });
}

/**
 * Similar with {@linkcode createDirIfNotExist} function, but it uses synchronous directory creation.
 *
 * @internal
 * @since 1.1.0
 * @see {@Link createDirIfNotExist}
 */
export function createDirIfNotExistSync(dirpath: PathLike): void {
  if (!fs.existsSync(dirpath)) fs.mkdirSync(dirpath, { recursive: true });
}

/**
 * Generates a random string with a specified length.
 *
 * The generated string is consisted of:
 *   - Uppercase letters (A-Z)
 *   - Lowercase letters (a-z)
 *   - Digits (0-9)
 *   - Hyphens (-)
 *   - Underscores (_)
 *
 * @remarks This function is the simplified version from similar function in
 *          [YouTube.js](https://github.com/LuanRT/YouTube.js) utilities.
 *          It is designed to be used for generating CPN for YouTube raw responses.
 *
 * @param length - The length of the string to be generated.
 *
 * @returns A random string with the specified length.
 *
 * @since 5.0.0
 */
export function generateRandomString(length: number): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  return Array.from({ length }, () => alphabet.charAt(Math.floor(Math.random() * alphabet.length))).join('');
}

// #endregion Utilities Function
