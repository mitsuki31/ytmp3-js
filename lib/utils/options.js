'use strict';

const TypeUtils = require('./type-utils');

const _YTDLChooseFormatOptions = {
  quality: ['string'],
  filter: [['string', 'function']],
  format: ['object']
};

const _YTDLGetInfoOptions = {
  lang: ['string'],
  requestCallback: ['function', () => {}],
  rewriteRequest: ['function'],
  fetch: ['function'],
  requestOptions: ['object'],
  agent: ['object'],
  playerClients: ['array']
};

const _YTDLDownloadOptions = {
  ..._YTDLChooseFormatOptions,
  ..._YTDLGetInfoOptions,
  range: ['object'],
  begin: [['string', 'number', Date]],
  liveBuffer: ['number'],
  highWaterMark: ['number'],
  IPv6Block: ['string'],
  dlChunkSize: ['number'],
};

const _GetInfoOptions = {
  ..._YTDLGetInfoOptions,
  useCache: ['boolean', true],
  asObject: ['boolean', false]
};

const _DownloadOptions = {
  ..._YTDLDownloadOptions,
  ...(Object.entries(_GetInfoOptions)
    .reduce((acc, val) => {
      // Exclude the `asObject` option
      if (val[0] !== 'asObject') acc[val[0]] = val[1];
      return acc;
    }, {})
  )
};


/**
 * Resolves and validates input options against expected types and default values.
 *
 * This function ensures that only recognized options with the correct types are retained.
 * If an option is missing or has an incorrect type, it is replaced with a default value (if specified).
 *
 * ### How It Works
 * - **Filters Out Unknown Options**: Only options defined in `expectedOpts` are included.
 * - **Validates Option Types**: Each option's type is checked against the expected type.
 * - **Supports Multiple Expected Types**: 
 *   - If an option accepts multiple types (e.g., `'string'` or `'number'`), 
 *     the function iterates through them and assigns the first valid type.
 * - **Handles Special Cases**:
 *   - `'array'` is explicitly checked using `Array.isArray()`.
 *   - `'function'` ensures that the value is callable but **not an ES6 class**.
 *   - If an **expected type is a class**, it checks if the value is an instance of that class.
 * - **Fallback to Default Values**: If an option is missing or invalid, the default value is used.
 *
 * @param {Record<string, any>} inOpts - The input options to be resolved.
 * @param {Record<string, (string | Function | (string | Function | any)[] | any)[]>} expectedOpts -
 *        An object defining expected types and default values. With the key being the option name and the value being
 *        an array defining the expected type(s) and default value.
 *
 * @returns {Record<string, any>} An object containing only the valid and resolved options.
 *
 * @example <caption> Basic usage with primitive types </caption>
 * const options = resolveOptions(
 *   { cacheSize: '10', verbose: true },
 *   { cacheSize: ['number', 5], verbose: ['boolean', false] }
 * );
 * console.log(options);  // { cacheSize: 5, verbose: true }
 *
 * @example <caption> Handling multiple expected types </caption>
 * const options = resolveOptions(
 *   { cacheSize: '10', mode: 'fast' },
 *   { cacheSize: [['number', 'string'], 5], mode: ['string', 'default'] }
 * );
 * console.log(options);  // { cacheSize: '10', mode: 'fast' }
 *
 * @example <caption> Handling class instances </caption>
 * class CacheHandler {}
 * const options = resolveOptions(
 *   { handler: new CacheHandler() },
 *   { handler: [CacheHandler, null] }
 * );
 * console.log(options);  // { handler: CacheHandler {} }
 *
 * @example <caption> Handling invalid values </caption>
 * const options = resolveOptions(
 *   { cacheSize: 'not a number' },
 *   { cacheSize: ['number', 10] }
 * );
 * console.log(options); // { cacheSize: 10 } // Falls back to default
 *
 * @package
 * @since 2.0.0
 */
function resolve(inOpts, expectedOpts) {
  const resolvedOptions = {};

  // Iterate over expected options to filter and validate the input options
  for (const [key, expectedTypeArray] of Object.entries(expectedOpts)) {
    const [expectedType, defaultValue] = expectedTypeArray;

    if (key in inOpts) {
      const value = inOpts[key];

      // Handle string type checks
      if (typeof expectedType === 'string') {
        let isValid;
        switch (expectedType) {
          case 'array':
            isValid = Array.isArray(value);
            break;
          case 'function':  // Any function but not a ES6 class
            isValid = !TypeUtils.isClass(value);
            break;
          default:
            isValid = typeof value === expectedType;
        }

        // Include the current option as resolved
        resolvedOptions[key] = isValid ? value : defaultValue;
      }
      // Handle class instance checks
      else if (TypeUtils.isCallable(expectedType)) {
        resolvedOptions[key] = value instanceof expectedType ? value : defaultValue;
      }
      // Handle multiple type checks
      else if (Array.isArray(expectedType)) {
        let value;

        for (const type of expectedType) {
          value = Object.values(resolve(
            { [key]: inOpts[key] },
            { [key]: [type] }
          ))[0];
        }
        resolvedOptions[key] = typeof value !== 'undefined' ? value : defaultValue;
      }
    } else {
      resolvedOptions[key] = defaultValue;
    }
  }

  return resolvedOptions;
}


module.exports = {
  _YTDLChooseFormatOptions,
  _YTDLGetInfoOptions,
  _YTDLDownloadOptions,
  _GetInfoOptions,
  _DownloadOptions,
  resolve,
  resolveOptions: resolve  // Alias
};
