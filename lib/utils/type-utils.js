/**
 * Utility submodule containing type checker and helper.
 *
 * @module    utils/type-utils
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
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
 * Returns the type of the provided value as a string.
 *
 * For `null` values, it returns `'null'`, and for objects, it returns a more detailed
 * type such as `'[object Object]'`.
 *
 * @param {any} x - The value whose type is to be determined.
 * @returns {string} A string representing the type of the value.
 *
 * @package
 * @since    1.1.0
 */
function getType(x) {
  return x === null
    ? 'null' : typeof x === 'object'
      ? Object.prototype.toString.call(x) : typeof x;
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
