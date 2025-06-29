/**
 * @module    types/utils
 * @author    Ryuu Mitsuki <https://github.com/mitsuki31>
 * @license   MIT
 * @since     5.0.0
 */

/**
 * Transforms an object type `T` by making all its properties both **mandatory**
 * (non-optional) and **non-nullable**.
 *
 * This means:
 * 1. If a property `P` in `T` was optional (`prop?: Type`), it will become mandatory (`prop: Type`).
 * 2. If a property `P` in `T` had `null` or `undefined` as part of its type (`Type | null | undefined`),
 * these will be removed, resulting in just `Type`.
 *
 * This type is ideal for creating a "cleaned" or "normalized" version of an object
 * where all expected properties must be present and hold concrete values.
 *
 * @typeParam T - The input object type.
 *
 * @example
 * ```ts
 *   interface UserProfile {
 *   id: number;
 *   username?: string;               // optional, can be undefined
 *   email: string | null;            // mandatory, but can be null
 *   age?: number | null | undefined; // optional, can be null or undefined
 *   isActive: boolean;               // mandatory, boolean
 * }
 *
 * // Example usage:
 * type CleanUserProfile = RequiredObject<UserProfile>;
 *
 * // Resulting type:
 * // {
 * //   id: number;
 * //   username: string;   // Was 'string | undefined', now 'string' and mandatory
 * //   email: string;      // Was 'string | null', now 'string'
 * //   age: number;        // Was 'number | null | undefined', now 'number' and mandatory
 * //   isActive: boolean;
 * // }
 * ```
 *
 * @internal
 * @since 5.0.0
 * @see {@link https://www.typescriptlang.org/docs/handbook/utility-types.html#requiredtype | Required&lt;Type&gt;}
 * @see {@link https://www.typescriptlang.org/docs/handbook/utility-types.html#nonnullabletype | NonNullable&lt;Type&gt;}
 */
export type RequiredObject<T> = {
  [K in keyof T]-?: NonNullable<T[K]>;
};

/**
 * Removes the `readonly` modifier from all properties of a type `T`.
 *
 * @typeParam T - The input object type.
 *
 * @internal
 * @since 5.0.0
 */
export type NonReadonly<T> = {
  -readonly [K in keyof T]: T[K]
};

/**
 * A utility type that transforms an object type `T` by:
 * 1. **Removing properties** whose values are `null` or `undefined`.
 * 2. For the **remaining properties**, making them both **mandatory** (non-optional)
 * and **non-nullable** (removing `null` and `undefined` from their value types).
 *
 * This type is particularly useful for "cleaning" object literals or elements within arrays
 * where you want to ensure all properties that exist are concrete and required.
 *
 * @typeParam T - The input object type.
 *
 * @example
 * ```ts
 * interface ItemRecord {
 *   id: string;
 *   name: string | null;               // Can be null
 *   description?: string;              // Optional, can be undefined
 *   quantity: number | undefined;      // Can be undefined
 *   category: 'A' | 'B';
 *   notes: string | null | undefined;  // Can be null or undefined
 * }
 *
 * // Example usage:
 * type CleanItem = DropNullAndUndefined<ItemRecord>;
 *
 * // Resulting type:
 * // {
 * //   id: string;        // Kept, type is string
 * //   category: 'A' | 'B'; // Kept, type is 'A' | 'B'
 * // }
 * // Properties 'name', 'description', 'quantity', 'notes' are removed
 * // because their original types allowed null or undefined values.
 * ```
 *
 * @internal
 * @since 5.0.0
 * @see {@link TypeUtils.dropNullAndUndefined}
 */
export type DropNullAndUndefined<T> = {
  [K in keyof T as T[K] extends (null | undefined) ? never : K]-?: NonNullable<T[K]>;
};

/**
 * Type alias for any plain object.
 *
 * @internal
 * @since 5.0.0
 */
export type AnyPlainObject =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Record<string | number | symbol, any>;

/**
 * Type alias for any dictionary.
 *
 * @internal
 * @since 5.0.0
 */
export type AnyDict =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  NodeJS.Dict<any>;

/**
 * Type alias for any function.
 *
 * @internal
 * @since 5.0.0
 */
export type AnyFunction =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (...args: any[]) => any;

/**
 * Type alias for any asynchronous function.
 *
 * @internal
 * @since 5.0.0
 */
export type AnyAsyncFunction =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (...args: any[]) => Promise<any>;

/**
 * Type alias for a function that takes no parameters.
 *
 * @internal
 * @since 5.0.0
 */
export type NoParamFunction<R = void> = () => R;

/**
 * Type alias for an asynchronous function that takes no parameters.
 *
 * @internal
 * @since 5.0.0
 */
export type NoParamAsyncFunction<R = void> = () => Promise<R>;

/**
 * Type alias for any class.
 *
 * @internal
 * @since 5.0.0
 */
export type AnyClass =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: any[]) => any;
