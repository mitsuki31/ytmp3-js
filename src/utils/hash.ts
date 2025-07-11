/**
 * Contains utility functions for calculating cryptographic hashes.
 *
 * @module    utils/hash
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import crypto from 'node:crypto';

/**
 * Calculates the SHA-256 hash of a given string.
 *
 * @param input - The string input to calculate the hash.
 * @param encoding - The encoding to use for the input string. Internally defaults to `'utf-8'`.
 *
 * @returns The SHA-256 hash as a hexadecimal string.
 *
 * @internal
 * @since 5.0.0
 */
export function calculateSHA256(input: string, encoding?: BufferEncoding): string {
  const hash = crypto.createHash('sha256');
  hash.update(input, encoding || 'utf-8');
  return hash.digest('hex');
}

/**
 * Calculates the SHA-512 hash of a given string.
 *
 * @param input - The string input to calculate the hash.
 * @param encoding - The encoding to use for the input string. Internally defaults to `'utf-8'`.
 *
 * @returns The SHA-512 hash as a hexadecimal string.
 *
 * @internal
 * @since 5.0.0
 */
export function calculateSHA512(input: string, encoding?: BufferEncoding): string {
  const hash = crypto.createHash('sha512');
  hash.update(input, encoding || 'utf-8');
  return hash.digest('hex');
}
