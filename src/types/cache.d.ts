/**
 * @module    types/cache
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */


/** @internal */
export interface SetCacheOptions {
  /**
   * If set to `true`, skip compression of the cache file.
   * The cache will be stored as uncompressed JSON.
   * @default false
   */
  noCompression?: boolean;
  /**
   * If `true`, overwrite the existing cache file regardless of expiration time.
   * @default false
   */
  force?: boolean;
  /**
   * A signal object that can be used to abort the operation.
   * @default undefined
   */
  signal?: AbortSignal;
}

/** @internal */
export interface GetCacheOptions {
  /**
   * Gets the raw cache object instead of parsed cache object (read and decompress only).
   */
  rawCache?: boolean;
  /**
   * Whether to allow the function to re-fetch if the cache has expired.
   * @default true
   */
  autoFetch?: boolean;
  /**
   * A signal object that can be used to abort the operation.
   * @default undefined
   */
  signal?: AbortSignal;
}
