/**
 * Utility submodule containing type checker and helper.
 *
 * @module    vendor/type-utils
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     1.2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class TypeUtils {
  /**
   * Checks if a value is either `null` or `undefined` (i.e., "nullish").
   * This is a type guard that narrows the type to `null | undefined`.
   *
   * @typeParam T - The type of the input value.
   * @param x - The value to check.
   * @returns `true` if the value is `null` or `undefined`, `false` otherwise.
   *
   * @example
   * ```ts
   * let myVar: string | null = null;
   * if (TypeUtils.isNullOrUndefined(myVar)) {
   *   // myVar is now typed as null | undefined
   * }
   * ```
   *
   * @internal
   * @since    1.0.0
   * @see      {@link TypeUtils.isNull | isNull}
   * @see      {@link TypeUtils.isUndefined | isUndefined}
   */
  static isNullOrUndefined<T>(x: T | null | undefined): x is null | undefined {
    return TypeUtils.isNull(x) || TypeUtils.isUndefined(x);
  }

  /**
   * Alias for {@linkcode TypeUtils.isNullOrUndefined | isNullOrUndefined}.
   * Checks if a value is "nullish" (`null` or `undefined`).
   * This is a type guard that narrows the type to `null | undefined`.
   *
   * @typeParam T - The type of the input value.
   * @param x - The value to check.
   * @returns `true` if the value is `null` or `undefined`, `false` otherwise.
   *
   * @internal
   * @since    5.0.0
   * @see      {@link TypeUtils.isNullOrUndefined | isNullOrUndefined}
   */
  static isNullish<T>(x: T | null | undefined): x is null | undefined {
    return TypeUtils.isNullOrUndefined(x);
  }

  /**
   * Checks if a value is neither `null` nor `undefined` (i.e., "non-nullish").
   * This is a type guard that narrows the type away from `null` and `undefined`.
   *
   * @typeParam T - The type of the input value.
   * @param x - The value to check.
   * @returns `true` if the value is not `null` and not `undefined`, `false` otherwise.
   *
   * @example
   * ```ts
   * let myValue: string | null = "hello";
   * if (TypeUtils.isNonNullish(myValue)) {
   *   // myValue is now typed as string
   * }
   * ```
   *
   * @internal
   * @since    5.0.0
   * @see      {@link TypeUtils.isNullOrUndefined | isNullOrUndefined}
   */
  static isNonNullish<T>(x: T | null | undefined): x is T {
    return !TypeUtils.isNullOrUndefined(x);
  }

  /**
   * Checks if a value is strictly `null`.
   *
   * @param x - The value to check.
   * @returns `true` if the value is `null`, otherwise `false`.
   *
   * @internal
   * @since  5.0.0
   */
  static isNull(x: any): x is null {
    return (x === null);
  }

  /**
   * Checks if a value is strictly `undefined`.
   *
   * @param x - The value to check.
   * @returns `true` if the value is `undefined`, otherwise `false`.
   *
   * @internal
   * @since  5.0.0
   */
  static isUndefined(x: any): x is undefined {
    return typeof x === 'undefined';
  }

  /**
   * Checks if an environment variable is defined and has a non-empty string value.
   *
   * @remarks
   * This function is specifically designed for checking `process.env` variables.
   * An environment variable is considered "defined" if it exists (is not `undefined`)
   * and its value is a non-empty string. An empty string (`''`) is treated as
   * "not defined" in this context, as is common for environment flags.
   *
   * @param envVar - The environment variable value to check (typically `process.env.YOUR_VAR`).
   * @returns `true` if the environment variable is a non-empty string, `false` otherwise.
   *
   * @example
   * ```bash
   * # Setting environment variables
   * env SOME_VAR="hello" EMPTY_VAR=""
   * ```
   *
   * ```ts
   * // Checking process.env.SOME_VAR
   * TypeUtils.isDefined(process.env.SOME_VAR); // Returns true
   * TypeUtils.isDefined(process.env.EMPTY_VAR); // Returns false
   *
   * // Given process.env.UNDEFINED_VAR is not set
   * TypeUtils.isDefined(process.env.UNDEFINED_VAR); // Returns false
   *
   * let myEnvVar: string | undefined = process.env.MY_FLAG;
   * if (TypeUtils.isDefined(myEnvVar)) {
   *   // myEnvVar is now safely typed as 'string'
   *   console.log(`My flag is set to: ${myEnvVar.toUpperCase()}`);
   * }
   * ```
   *
   * @internal
   * @since    5.0.0
   * @see      {@link TypeUtils.isNonNullish | isNonNullish} - Use this function to check if a value is "non-nullish".
   */
  static isDefined(envVar: string | undefined): envVar is string {
    return typeof envVar === 'string' && envVar !== '';
  }

  /**
   * Determines whether the provided value is a string.
   *
   * @param x - The value to be checked.
   * @returns `true` if the value is a string, otherwise `false`.
   *
   * @internal
   * @since    5.0.0
   */
  static isString(x: any): x is string {
    return typeof x === 'string';
  }

  /**
   * Determines whether the provided value is a number (not a `bigint`).
   *
   * @param x - The value to be checked.
   * @returns `true` if the value is a number, otherwise `false`.
   *
   * @internal
   * @since    5.0.0
   * @see      {@link isBigInt}
   */
  static isNumber(x: any): x is number {
    return typeof x === 'number';
  }

  /**
   * Determines whether the provided value is a `bigint`.
   *
   * @param x - The value to be checked.
   * @returns `true` if the value is a `bigint`, otherwise `false`.
   *
   * @internal
   * @since    5.0.0
   * @see      {@link isNumber}
   */
  static isBigInt(x: any): x is bigint {
    return typeof x === 'bigint';
  }

  /**
   * Determines whether the provided value is a boolean.
   *
   * @param x - The value to be checked.
   * @returns `true` if the value is a boolean, otherwise `false`.
   *
   * @internal
   * @since    5.0.0
   */
  static isBoolean(x: any): x is boolean {
    return typeof x === 'boolean';
  }

  /**
   * Determines whether the provided value is a non-null object.
   *
   * This function returns `true` for any value that is of the object type and is not `null`, 
   * but it does not guarantee that the object is a plain object (`{}`).
   *
   * @param x - The value to be checked.
   * @returns `true` if the value is a non-null object, otherwise `false`.
   *
   * @internal
   * @since    1.0.0
   * @see      {@link isPlainObject}
   */
  static isObject(x: unknown): x is object {
    return (
      !TypeUtils.isNullOrUndefined(x) &&
      typeof x === 'object' &&
      !Array.isArray(x) &&
      Object.prototype.toString &&
      /^\[object .+\]$/.test(Object.prototype.toString.call(x))
    );
  }

  /**
   * Determines whether the provided value is a plain object (`{}`).
   *
   * This function returns `true` only if the value is a non-null object with
   * a prototype of `Object`.
   *
   * @param x - The value to be checked.
   * @returns `true` if the value is a plain object, otherwise `false`.
   *
   * @internal
   * @since    1.1.0
   * @see      {@link isObject}
   */
  static isPlainObject<T extends Record<any, any>>(x: unknown): x is T {
    return (
      !TypeUtils.isNullOrUndefined(x) &&
      typeof x === 'object' &&
      !Array.isArray(x) &&
      Object.prototype.toString &&
      /^\[object Object\]$/.test(Object.prototype.toString.call(x))
    );
  }

  /**
   * Determines whether the provided value is a ES6 class.
   *
   * |           Symbol        |    Value   |
   * | ----------------------- | ---------- |
   * | `class {}`              | `true`     |
   * | `class A extends B {}`  | `true`     |
   * | `function () {}`        | `false`    |
   * | `function () {}.bind()` | `false`    |
   * | `() => {}`              | `false`    |
   * | `{}`                    | `false`    |
   * | `URL`                   | `true`     |
   *
   * @param x - The value to be checked.
   * @returns `true` if the value is a ES6 class, otherwise `false`.
   *
   * @internal
   * @since    5.0.0
   */
  static isClass<T extends new (...args: any[]) => any>(x: unknown): x is T {
    return (
      TypeUtils.isCallable(x)
      && /^class/.test(Function.prototype.toString.call(x))
    );
  }

  /**
   * Deterimines whether the provided value is a callable (e.g., a function).
   *
   * Native classes and ES6 classes will give a `true` value, because they were callable.
   *
   * @param x - The value to be checked.
   * @returns `true` if the given value is a callable, otherwise `false`.
   *
   * @internal
   * @since    5.0.0
   */
  static isCallable<T extends (...args: any[]) => any>(x: unknown): x is T {
    return (
      !TypeUtils.isNullOrUndefined(x)
      && typeof x === 'function'
      && !(Object.getOwnPropertyDescriptor(x, 'prototype')?.writable || false)
    );
  }

  /**
   * Returns the type of the provided value as a string.
   *
   * For `null` values, it returns `'null'`, and for objects or class instances, `Date` object for example,
   * it returns a more detailed type such as `'[object Date]'`. If the `nameOnly` set to `true`,
   * the returned string will be the name of the object itself, `'Date'`.
   *
   * @param x - The value whose type is to be determined.
   * @param nameOnly - Whether to get the name of the given object or instance of class,
   *                   instead the detailed information. This option only works for symbols
   *                   that returns `'object'` when called using `typeof`.
   * @returns A string representing the type of the value.
   *
   * @internal
   * @since    1.1.0
   */
  static getType(x: any, nameOnly = false): string {
    return x === null
      ? 'null' : typeof x === 'object'
        ? (nameOnly
          ? (/^\[object (.+)\]$/.exec(
            Object.prototype.toString.call(x)) || [])[1]
          : Object.prototype.toString.call(x)
        ) : typeof x;
  }

  /**
   * Returns the detailed type of the provided value as a string.
   *
   * @remarks
   * This function is an alias for {@linkcode getType} with the `nameOnly` parameter set to `false`.
   *
   * @param {unknown} x - The value whose type is to be determined.
   * @returns {string} A string representing the detailed type of the value.
   *
   * @internal
   * @since 5.0.0
   * @see {@link getType}
   */
  static typeOf(x: any): string {
    return TypeUtils.getType(x, false);
  }
}

// Exports
export const isNullOrUndefined = TypeUtils.isNullOrUndefined;
export const isNullish = TypeUtils.isNullish;
export const isNonNullish = TypeUtils.isNonNullish;
export const isNull = TypeUtils.isNull;
export const isUndefined = TypeUtils.isUndefined;
export const isDefined = TypeUtils.isDefined;
export const isString = TypeUtils.isString;
export const isNumber = TypeUtils.isNumber;
export const isBigInt = TypeUtils.isBigInt;
export const isObject = TypeUtils.isObject;
export const isPlainObject = TypeUtils.isPlainObject;
export const isClass = TypeUtils.isClass;
export const isCallable = TypeUtils.isCallable;
export const getType = TypeUtils.getType;
export const typeOf = TypeUtils.typeOf;
