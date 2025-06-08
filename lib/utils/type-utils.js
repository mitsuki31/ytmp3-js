/**
 * Utility submodule containing type checker and helper.
 *
 * @module    utils/type-utils
 * @author    Ryuu Mitsuki <{@link https://github.com/mitsuki31}>
 * @license   MIT
 * @since     1.2.0
 */

'use strict';

const TypeUtils = {};

/**
 * Checks if a given value is null or undefined.
 *
 * @param {any} x - The value to check.
 * @returns {boolean} `true` if the value is null or undefined, otherwise `false`.
 *
 * @package
 * @since  1.0.0
 */
function isNullOrUndefined(x) {
  return (x === null || typeof x === 'undefined');
}
TypeUtils.isNullOrUndefined = isNullOrUndefined;  // Assign to `TypeUtils`

/**
 * Determines whether the provided value is a non-null object.
 *
 * This function returns `true` for any value that is of the object type and is not `null`, 
 * but it does not guarantee that the object is a plain object (`{}`).
 *
 * @param {any} x - The value to be checked.
 * @returns {boolean} `true` if the value is a non-null object, otherwise `false`.
 *
 * @package
 * @since    1.0.0
 * @see      {@link module:utils~isPlainObject isPlainObject}
 */
function isObject(x) {
  return (
    !isNullOrUndefined(x) &&
    typeof x === 'object' &&
    !Array.isArray(x) &&
    Object.prototype.toString &&
    /^\[object .+\]$/.test(Object.prototype.toString.call(x))
  );
}
TypeUtils.isObject = isObject;  // Assign to `TypeUtils`

/**
 * Determines whether the provided value is a plain object (`{}`).
 *
 * This function returns `true` only if the value is a non-null object with
 * a prototype of `Object`.
 *
 * @param {any} x - The value to be checked.
 * @returns {boolean} `true` if the value is a plain object, otherwise `false`.
 *
 * @package
 * @since    1.1.0
 * @see      {@link module:utils~isObject isObject}
 */
function isPlainObject(x) {
  return (
    !isNullOrUndefined(x) &&
    typeof x === 'object' &&
    !Array.isArray(x) &&
    Object.prototype.toString &&
    /^\[object Object\]$/.test(Object.prototype.toString.call(x))
  );
}
TypeUtils.isPlainObject = isPlainObject;  // Assign to `TypeUtils`

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
 * @param {any} x - The value to be checked.
 * @returns {boolean} `true` if the value is a ES6 class, otherwise `false`.
 *
 * @package
 * @since    2.0.0
 */
function isClass(x) {
  return (
    !isNullOrUndefined(x) &&
    typeof x === 'function' &&
    isCallable(x) && /^class/.test(Function.prototype.toString.call(x))
  );
}
TypeUtils.isClass = isClass;

/**
 * Deterimines whether the provided value is a callable (e.g., a function).
 *
 * Native classes and ES6 classes will give a `true` value, because they were callable.
 *
 * @param {any} x - The value to be checked.
 * @returns {boolean} `true` if the given value is a callable, otherwise `false`.
 *
 * @package
 * @since   2.0.0
 */
function isCallable(x) {
  return (
    !isNullOrUndefined(x) &&
    typeof x === 'function' &&
    !(Object.getOwnPropertyDescriptor(x, 'prototype')?.writable || false)
  );
}
TypeUtils.isCallable = isCallable;

/**
 * Returns the type of the provided value as a string.
 *
 * For `null` values, it returns `'null'`, and for objects or class instances, `Date` object for example,
 * it returns a more detailed type such as `'[object Date]'`. If the `nameOnly` set to `true`,
 * the returned string will be the name of the object itself, `'Date'`.
 *
 * @param {any} x - The value whose type is to be determined.
 * @param {boolean} [nameOnly=false] - Whether to get the name of the given object or instance of class,
 *                                     instead the detailed information. This option only works for symbols
 *                                     that returns `'object'` when called using `typeof`.
 * @returns {string} A string representing the type of the value.
 *
 * @package
 * @since    1.1.0
 */
function getType(x, nameOnly=false) {
  return x === null
    ? 'null' : typeof x === 'object'
      ? (nameOnly
        ? (/^\[object (.+)\]$/.exec(
          Object.prototype.toString.call(x)) || [])[1]
        : Object.prototype.toString.call(x)
      ) : typeof x;
}
TypeUtils.getType = getType;  // Assign to `TypeUtils`

/**
 * Drops null and undefined values from the input object.
 *
 * @param {Object} obj - The input object to filter null and undefined values from.
 * @return {Object} The filtered object without null and undefined values.
 *
 * @package
 * @since  1.0.0
 */
function dropNullAndUndefined(obj) {
  return Object.keys(obj).reduce((acc, key) => {
    if (!isNullOrUndefined(obj[key])) acc[key] = obj[key];
    return acc;
  }, {});
}
TypeUtils.dropNullAndUndefined = dropNullAndUndefined;  // Assign to `TypeUtils`

module.exports = TypeUtils;
