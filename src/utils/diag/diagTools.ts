/**
 * @module    utils/diag/diagTools
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

import util from 'node:util';
import { InvalidTypeError } from '#error';
import type { Logger } from '#utils/log/index.js';
import type { NoParamAsyncFunction, NoParamFunction } from '#/utils/index.js';

/**
 * Logs an error using the provided logger instance with a formatted message.
 *
 * This function formats an error message using the provided format string or
 * defaults to the error's message with a placeholder. The error details, such
 * as its name and message, are inspected and included in the log output. The
 * log output includes ANSI colors for better readability.
 *
 * @param fmt - The format string for the error message. If `null`, defaults to
 *              the error's message followed by a placeholder.
 * @param error - The error object containing details to be logged.
 * @param logger - The logger instance responsible for logging the error message.
 *
 * @internal
 * @since 5.0.0
 */
export function logError(fmt: string | null, error: Error, logger: Logger): void {
  fmt = fmt?.replace(/\s*%s$/, ' %s') || error.message + ' %s';
  logger.error(util.format(fmt,
    // @ts-expect-error: This spread always overwrites this property
    util.inspect({ name: error.name, message: error.message, ...error },
      { compact: false, colors: true }
    )
  ));
}

/**
 * Captures all output written to `process.stdout` during the asynchronous function's execution.
 * This is useful for intercepting printed output from libraries or functions that write to `stdout` directly.
 *
 * @param asyncFn - An asynchronous function (returns a  Promise ) to execute.
 *                  Any output written to `stdout` during its execution will be captured.
 *
 * @returns The accumulated stdout output during the function's execution.
 *
 * @example
 * ```ts
 * const output = await captureStdout(async () => {
 *   await someAsyncPrintOperation();
 * });
 * console.log('Captured:', output);
 * ```
 *
 * @internal
 * @since    5.0.0
 */
export async function captureStdout(asyncFn: NoParamAsyncFunction<void>): Promise<string> {
  let output = '';
  const originalWrite = process.stdout.write;

  // Override process.stdout.write
  // @ts-expect-error: No overload matches this call
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  process.stdout.write = (chunk, _encoding, _callback) => {
    output += chunk.toString();
    return true;
  };

  try {
    await asyncFn();
  } finally {
    // * NOTE: Do not forget to restore the built-in function
    process.stdout.write = originalWrite;
  }

  return output;
}

/**
 * Captures all output written to `process.stdout` during the synchronous function's execution.
 * This is useful for intercepting printed output from libraries or functions that write to `stdout` directly.
 *
 * Throws a {@link InvalidTypeError} if the provided function is asynchronous.
 *
 * @param fn - A synchronous function to execute. Any output written to `stdout`
 *             during its execution will be captured.
 *
 * @returns The accumulated stdout output during the function's execution.
 *
 * @throws {@link InvalidTypeError} If the provided function is asynchronous.
 *
 * @example
 * ```ts
 * const usageText = captureStdoutSync(() => {
 *   parser.printUsage();
 * });
 * ```
 *
 * @internal
 * @since    5.0.0
 */
export function captureStdoutSync(fn: NoParamFunction<void>): string {
  if (util.types.isAsyncFunction(fn)) {
    throw new InvalidTypeError('Given function must be synchronous function', {
      actualType: `[AsyncFunction ${fn.name ?? '(anonymous)'}]`,
      expectedType: `[Function ${fn.name ?? '(anonymous)'}]`
    });
  }

  let output = '';
  const originalWrite = process.stdout.write;

  // Override process.stdout.write
  // @ts-expect-error: No overload matches this call
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  process.stdout.write = (chunk, _encoding, _callback) => {
    output += chunk.toString();
    return true;
  };

  try {
    fn();
  } finally {
    // * NOTE: Do not forget to restore the built-in function
    process.stdout.write = originalWrite;
  }

  return output;
}

/**
 * Captures all output written to `process.stderr` during the asynchronous function's execution.
 * This is useful for intercepting printed output from libraries or functions that write to `stderr` directly.
 *
 * @param asyncFn - An asynchronous function (returns a `Promise`) to execute.
 *                  Any output written to `stderr` during its execution will be captured.
 *
 * @returns The accumulated stderr output during the function's execution.
 *
 * @internal
 * @since    5.0.0
 */
export async function captureStderr(asyncFn: NoParamAsyncFunction<void>): Promise<string> {
  const originalWrite = process.stderr.write;
  let output = '';

  // Override process.stderr.write
  // @ts-expect-error: No overload matches this call
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  process.stderr.write = (chunk, _encoding, _callback) => {
    output += chunk.toString();
    return true;
  };

  try {
    await asyncFn();
  } finally {
    // * NOTE: Do not forget to restore the built-in function
    process.stderr.write = originalWrite;
  }

  return output;
}

/**
 * Captures all output written to `process.stderr` during the synchronous function's execution.
 * This is useful for intercepting printed output from libraries or functions that write to `stderr` directly.
 *
 * Throws a {@link InvalidTypeError} if the provided function is asynchronous.
 *
 * @param fn - A synchronous function to execute. Any output written to `stderr`
 *             during its execution will be captured.
 *
 * @returns The accumulated stdout output during the function's execution.
 *
 * @throws {@link InvalidTypeError} If the provided function is asynchronous.
 *
 * @internal
 * @since    5.0.0
 */
export function captureStderrSync(fn: NoParamFunction<void>): string {
  if (util.types.isAsyncFunction(fn)) {
    throw new InvalidTypeError('Given function must be synchronous function', {
      actualType: `[AsyncFunction ${fn.name ?? '(anonymous)'}]`,
      expectedType: `[Function ${fn.name ?? '(anonymous)'}]`
    });
  }

  const originalWrite = process.stderr.write;
  let output = '';

  // Override process.stderr.write
  // @ts-expect-error: No overload matches this call
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  process.stderr.write = (chunk, _encoding, _callback) => {
    output += chunk.toString();
    return true;
  };

  try {
    fn();
  } finally {
    // * NOTE: Do not forget to restore the built-in function
    process.stderr.write = originalWrite;
  }

  return output;
}
